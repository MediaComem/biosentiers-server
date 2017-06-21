const _ = require('lodash');
const app = require('../app');
const config = require('../../config');
const db = require('../db');
const expect = require('chai').expect;
const expectations = require('./expectations/response');
const httpStatuses = require('http-status');
const moment = require('moment');
const Promise = require('bluebird');
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

exports.setUp = function(data, callback) {
  if (_.isFunction(data)) {
    callback = data;
    data = {};
  } else if (!data) {
    data = {};
  }

  data.beforeSetup = moment();

  return Promise.resolve()
    .then(exports.cleanDatabase)
    .then(_.partial(exports.resolve, data, true))
    .then(callback || _.noop)
    .then(function() {
      if (!_.has(data, 'now')) {
        data.now = moment();
      }

      const duration = moment().diff(data.beforeSetup) / 1000;
      logger.debug('Completed test setup in ' + duration + 's');
    }).return(exports);
};

exports.cleanDatabase = function() {
  const start = moment();
  return Promise.all([
    db.knex.raw('TRUNCATE user_account;')
  ]).then(function() {
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
  return Promise.resolve(data).then(function(resolved) {
    return new model(resolved).save();
  });
};

exports.resolve = function(data, inPlace) {
  if (_.isPlainObject(data)) {
    return Promise.props(_.mapValues(data, function(value) {
      return exports.resolve(value, inPlace);
    })).then(resolvedDataUpdater(data, inPlace));
  } else if (_.isArray(data)) {
    return Promise.all(_.map(data, function(value) {
      return exports.resolve(value, inPlace);
    })).then(resolvedDataUpdater(data, inPlace));
  } else {
    return Promise.resolve(data);
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

exports.expectTimestamp = function(actual, expected, type) {

  const name = type + 'At';
  const afterName = type + 'After';
  const beforeName = type + 'Before';

  if (_.isString(expected[name]) && expected[name].match(/At$/)) {
    expect(actual[name], 'user.' + name).to.equal(actual[name]);
  } else if (expected[name]) {
    expect(actual[name], 'user.' + name).to.be.iso8601(expected[name]);
  } else if (expected[afterName]) {
    expect(actual[name], 'user.' + name).to.be.iso8601('justAfter', expected[afterName]);
  } else if (expected[beforeName]) {
    expect(actual[name], 'user.' + name).to.be.iso8601('justBefore', expected[beforeName]);
  } else {
    throw new Error('User expectation requires either `' + type + 'At`, `' + type + 'Before` or `' + type + 'After` to be specified to check the ' + name + ' timestamp');
  }
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
      return Promise.resolve(result).catch(function(err) {
        return Promise.reject(enrichResponseAssertionError(err, res));
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
