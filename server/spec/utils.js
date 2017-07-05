const _ = require('lodash');
const app = require('../app');
const config = require('../../config');
const db = require('../db');
const expect = require('chai').expect;
const expectations = require('./expectations/response');
const httpStatuses = require('http-status');
const moment = require('moment');
const BPromise = require('bluebird');
const supertest = require('supertest-as-promised');

const logger = config.logger('spec');

exports.testApi = function(method, path) {
  method = (method || 'GET').toLowerCase();
  return supertest(app)[method]('/api' + path);
};

exports.testCreate = function(path, body) {
  return exports
    .testApi('POST', path)
    .send(body)
    .expect(expectations.json(201));
};

exports.testRetrieve = function(path) {
  return exports
    .testApi('GET', path)
    .expect(expectations.json(200));
};

exports.testUpdate = function(path, body) {
  return exports
    .testApi('PATCH', path)
    .send(body)
    .expect(expectations.json(200));
};

exports.setUp = function(data, beforeResolve) {
  if (!_.isFunction(data)) {
    const originalData = data;
    data = function() {
      return originalData;
    };
  }

  if (beforeResolve && !_.isArray(beforeResolve)) {
    beforeResolve = [ beforeResolve ];
  }

  const beforeSetup = moment();

  return BPromise.resolve()
    .then(exports.cleanDatabase)
    .then(() => BPromise.all(_.map(beforeResolve, func => func())))
    .then(() => exports.resolve(data(), true))
    .then(function(resolvedData) {
      _.defaults(resolvedData, {
        beforeSetup: beforeSetup,
        now: moment()
      });

      const duration = moment().diff(resolvedData.beforeSetup) / 1000;
      logger.debug('Completed test setup in ' + duration + 's');
    })
    .return(exports);
};

exports.cleanDatabase = function() {
  const start = moment();

  const tablesToDelete = [
    'bird', 'butterfly', 'flower', 'tree',
    'bird_species', 'bird_family', 'bird_height',
    'butterfly_species', 'butterfly_family',
    'flower_species', 'tree_species', 'flora_family',
    'class', 'division', 'reign',
    'poi', 'owner',
    'participant',
    'excursions_themes', 'excursions_zones', 'excursion',
    'path', 'path_type', 'zone_point', 'zone',
    'theme', 'trail',
    'user_account'
  ];

  let promise = BPromise.resolve();
  _.each(tablesToDelete, (table) => {
    promise = promise.then(function() {
      return db.knex.raw(`DELETE from ${table};`);
    })
  });

  return promise.then(function() {
    const duration = moment().diff(start) / 1000;
    logger.debug('Cleaned database in ' + duration + 's');
  });
};

exports.enrichExpectation = function(checkFunc) {

  checkFunc.inBody = exports.responseExpectationFactory(function(res) {
    const args = Array.prototype.slice.call(arguments, 1);
    args.unshift(res.body);
    return checkFunc.apply(undefined, args);
  });

  return checkFunc;
};

exports.createRecord = function(model, data) {
  return BPromise.resolve(data).then(function(resolved) {
    _.each(resolved, (value, key) => {
      if (moment.isMoment(value)) {
        throw new Error(`Value "${value}" at "${key}" is a moment object; convert it with "toDate()" before passing it to "createRecord"`);
      }
    });

    return new model(resolved).save();
  });
};

exports.resolve = function(data, inPlace) {
  if (_.isFunction(data)) {
    return exports.resolve(data(), inPlace);
  } else if (_.isPlainObject(data)) {
    return BPromise.props(_.mapValues(data, function(value) {
      return exports.resolve(value, inPlace);
    })).then(resolvedDataUpdater(data, inPlace));
  } else if (_.isArray(data)) {
    return BPromise.all(_.map(data, function(value) {
      return exports.resolve(value, inPlace);
    })).then(resolvedDataUpdater(data, inPlace));
  } else {
    return BPromise.resolve(data);
  }
};

exports.responseExpectationFactory = function(func) {
  return function() {
    const args = _.toArray(arguments);
    return handleResponseAssertionError(function(res) {
      args.unshift(res);
      return func.apply(undefined, args);
    });
  };
};

exports.expectTimestamp = function(type, actual, expected, timestampType, options) {
  if (!_.isString(type)) {
    throw new Error('Type must be a string describing the type of record');
  } else if (!_.isString(timestampType)) {
    throw new Error('Timestamp type must be a string identifying the timestamp (e.g. "created" or "updated")');
  }

  const name = timestampType + 'At';
  const afterName = timestampType + 'After';
  const beforeName = timestampType + 'Before';
  const desc = `${type}.${name}`;

  options = _.extend({}, options);
  const required = _.get(options, 'required', true);

  if (_.isString(expected[name]) && expected[name].match(/At$/)) {
    expect(actual[name], desc).to.equal(actual[expected[name]]);
  } else if (expected[name]) {
    expect(actual[name], desc).to.be.iso8601(expected[name]);
  } else if (expected[afterName]) {
    expect(actual[name], desc).to.be.iso8601('justAfter', expected[afterName]);
  } else if (expected[beforeName]) {
    expect(actual[name], desc).to.be.iso8601('justBefore', expected[beforeName]);
  } else if (!required) {
    expect(actual, desc).not.to.have.property(name);
  } else {
    throw new Error(`Expectation for ${name} requires either "${name}", "${afterName}" or "${beforeName}" to be specified`);
  }
};

exports.expectIfElse = function(actual, desc, condition, ifFunc, elseFunc) {
  if (!_.isString(desc)) {
    throw new Error('Description must be a string');
  } else if (!_.isFunction(ifFunc)) {
    throw new Error('If function is required');
  } else if (!_.isFunction(elseFunc)) {
    throw new Error('Else function is required');
  }

  const fulfilled = _.isFunction(condition) ? condition() : condition;
  (fulfilled ? ifFunc : elseFunc)(expect(actual, desc));
};

function resolvedDataUpdater(data, update) {
  return function(resolved) {
    if (update) {
      _.each(resolved, function(value, key) {
        data[key] = value;
      });

      return data;
    } else {
      return resolved;
    }
  };
}

function handleResponseAssertionError(func) {
  return function(res) {
    try {
      const result = func(res);
      return BPromise.resolve(result).catch(function(err) {
        return BPromise.reject(enrichResponseAssertionError(err, res));
      }).return(res);
    } catch(err) {
      throw enrichResponseAssertionError(err, res);
    }
  };
}

function enrichResponseAssertionError(err, res) {
  if (err.name != 'AssertionError' || err.stack.match(/^\s*HTTP\/1\.1/)) {
    return err;
  }

  let resDesc = 'HTTP/1.1 ' + res.status;

  const code = httpStatuses[res.status];
  if (code) {
    resDesc = resDesc + ' ' + code;
  }

  _.each(res.headers, function(value, key) {
    resDesc = resDesc + '\n' + key + ': ' + value;
  });

  if (res.body) {
    resDesc = resDesc + '\n\n';

    const contentType = res.get('Content-Type');
    if (contentType.match(/^application\/json/)) {
      resDesc = resDesc + JSON.stringify(res.body, null, 2);
    } else {
      resDesc = resDesc + res.body.toString();
    }
  }

  let rest;
  let message = 'AssertionError: ' + err.message;

  if (err.stack.indexOf(message) === 0) {
    rest = err.stack.slice(message.length + 1);
  } else {
    const firstEol = err.stack.indexOf('\n');
    message = err.stack.slice(0, firstEol);
    rest = err.stack.slice(firstEol);
  }

  let indent = '';

  const indentMatch = rest.match(/^\s+/);
  if (indentMatch) {
    indent = Array(indentMatch[0].length + 1).join(' ');
  }

  err.stack = message + '\n' + resDesc.replace(/^/gm, indent) + '\n\n' + rest;

  return err;
}
