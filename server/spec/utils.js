const _ = require('lodash');
const app = require('../app');
const config = require('../../config');
const db = require('../db');
const expect = require('./chai').expect;
const expectations = require('./expectations/response');
const mailer = require('../lib/mailer');
const moment = require('moment');
const BPromise = require('bluebird');
const responseExpectation = require('./response-expectation');
const supertest = require('supertest-as-promised');

let databaseConnectionClosed = false;
const logger = config.logger('spec');
const timestampComparisons = [ 'at', 'gt', 'gte', 'lt', 'lte', 'justAfter', 'justBefore' ];

if (config.env != 'test') {
  throw new Error('$NODE_ENV must be "test"');
}

exports.testApi = function(method, path, body) {
  method = (method || 'GET').toLowerCase();

  let test = supertest(app)[method](`/api${path}`);
  if (body) {
    test = test.send(body);
  }

  return test;
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

  const originalData = data;
  if (!_.isFunction(data)) {
    data = function() {
      return originalData;
    };
  }

  if (beforeResolve && !_.isArray(beforeResolve)) {
    beforeResolve = [ beforeResolve ];
  }

  const beforeSetup = moment();

  let promise = BPromise.resolve()

  if (!originalData.databaseCleaned) {
    promise = promise.then(exports.cleanDatabase)
  }

  if (!originalData.testMailsCleaned) {
    promise = promise.then(exports.cleanTestMails);
  }

  return promise.then(() => BPromise.all(_.map(beforeResolve, func => func())))
    .then(() => exports.resolve(data(), true))
    .then(function(resolvedData) {
      _.defaults(resolvedData, {
        databaseCleaned: true,
        beforeSetup: beforeSetup,
        testMailsCleaned: true
      });

      resolvedData.now = moment();
      resolvedData.afterSetup = resolvedData.now;

      const duration = moment().diff(beforeSetup) / 1000;
      logger.debug('Completed test setup in ' + duration + 's');
    })
    .return(exports);
};

exports.setUpMocha = function() {
  after(() => {
    if (!databaseConnectionClosed) {
      db.disconnect();
      databaseConnectionClosed = true;
    }
  });
};

exports.cleanDatabase = function() {
  const start = moment();

  // Sequences of tables to delete in order to avoid foreign key conflicts
  const tablesToDelete = [
    [ 'bird', 'butterfly', 'excursions_themes', 'excursions_zones', 'flower', 'installation_event', 'participant', 'pois_zones', 'trails_zones', 'tree', 'zone_point' ],
    [ 'bird_species', 'bird_height', 'butterfly_species', 'excursion', 'flower_species', 'installation', 'poi', 'tree_species', 'zone' ],
    [ 'bird_family', 'butterfly_family', 'flora_family', 'owner', 'theme', 'trail', 'user_account' ],
    [ 'class', 'division' ],
    [ 'reign' ]
  ];

  let promise = BPromise.resolve();
  _.each(tablesToDelete, tableList => {
    promise = promise.then(function() {
      return Promise.all(tableList.map(table => {
        return db.knex.raw(`DELETE from ${table};`);
      }));
    })
  });

  return promise.then(function() {
    const duration = moment().diff(start) / 1000;
    logger.debug('Cleaned database in ' + duration + 's');
  });
};

exports.cleanTestMails = function() {
  mailer.testMails.length = 0;
};

exports.enrichExpectation = function(checkFunc) {

  checkFunc.inBody = responseExpectation(function(res, ...args) {
    return BPromise.resolve().then(() => checkFunc(res.body, ...args)).return(res);
  });

  checkFunc.listInBody = responseExpectation(function(res, expected, ...args) {
    if (!_.isArray(expected)) {
      throw new Error('Expected must be an array');
    }

    expect(res.body).to.be.an('array');

    return BPromise
      .resolve()
      .then(() => BPromise.all(expected.map((exp, i) => checkFunc(res.body[i], exp, ...args))))
      .then(() => expect(res.body).to.have.lengthOf(expected.length))
      .return(res);
  });

  checkFunc.inDb = function(...args) {
    if (!checkFunc.db) {
      throw new Error('Expectation function has no "db" property');
    }

    return function(res) {
      return BPromise
        .resolve()
        .then(() => checkFunc.db(...args))
        .return(res);
    };
  };

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

exports.hasExpectedTimestamp = function(expected, timestampType) {
  return _.some(timestampComparisons, comparison => hasExpectedTimestampComparison(expected, timestampType, comparison));
};

exports.expectTimestamp = function(type, actual, expected, timestampType, options) {
  if (!_.isString(type)) {
    throw new Error('Type must be a string describing the type of record');
  } else if (!_.isString(timestampType)) {
    throw new Error('Timestamp type must be a string identifying the timestamp (e.g. "created" or "updated")');
  }

  const property = `${timestampType}At`;
  const desc = `${type}.${property}`;
  const required = _.get(options, 'required', true);
  const comparisons = timestampComparisons.filter(comparison => hasExpectedTimestampComparison(expected, timestampType, comparison));

  comparisons.forEach(comparison => {
    const comparisonProperty = getExpectedTimestampComparisonProperty(timestampType, comparison);
    if (_.isString(comparisonProperty) && comparisonProperty.match(/At$/) && _.isString(expected[comparisonProperty]) && expected[comparisonProperty].match(/At$/)) {
      expect(actual[property], desc).to.be.iso8601('at', actual[expected[comparisonProperty]]);
    } else {
      expect(actual[property], desc).to.be.iso8601(comparison, expected[comparisonProperty]);
    }
  });

  if (!comparisons.length) {
    if (!required) {
      expect(actual, desc).not.to.have.property(property);
    } else {
      const descriptions = timestampComparisons.map(comparison => getExpectedTimestampComparisonProperty(timestampType, comparison)).join(', ');
      throw new Error(`Timestamp expectation ${desc} requires at least one of ${descriptions} to be specified`);
    }
  }
};

function hasExpectedTimestampComparison(expected, timestampType, comparison) {
  return expected[getExpectedTimestampComparisonProperty(timestampType, comparison)];
}

function getExpectedTimestampComparisonProperty(timestampType, comparison) {
  return `${timestampType}${comparison.charAt(0).toUpperCase()}${comparison.slice(1)}`;
}

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

exports.checkRecord = async function(model, expected, options) {
  if (!expected.id) {
    throw new Error('Record ID is required');
  }

  const idColumn = _.get(options, 'idColumn', 'api_id');
  const record = await new model().where(idColumn, expected.id).fetch();
  if (!record) {
    throw new Error(`No database record found with ID ${expected.id}`);
  }

  return record;
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
