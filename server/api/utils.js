const _ = require('lodash');
const auth = require('./auth');
const config = require('../../config');
const errors = require('./errors');
const inflection = require('inflection');
const Promise = require('bluebird');
const valdsl = require('../lib/valdsl');

exports.notYetImplemented = function(req, res) {
  res.sendStatus(418);
};

exports.authorize = auth.authorize;

exports.builder = function(model, name) {
  return new ApiBuilder(model, name);
};

exports.includes = function(req, related) {

  let includes = req.query.include;
  if (!includes) {
    return false;
  }

  if (!_.isArray(includes)) {
    includes = [ includes ];
  }

  return _.includes(includes, related);
};

function ApiBuilder(model, name) {
  this.model = model;
  this.logger = config.logger('api:' + name);
}

/**
 * Creates a middleware function that facilitates writing asynchronous routes with promises.
 *
 * Instead of being called with the signature `function(req, res, next)`, the provided definition function is
 * called with the signature `function(req, res, helper)`. `helper` is an object bound to the request and response
 * and provides several utility methods.
 *
 * The definition function MUST return a value or promise.
 * That value or promise will be resolved and the standard `next` function will automatically be called if the returned promise is rejected.
 *
 * @param {String} definition - A route definition function that takes the request, response and API helper as arguments.
 * @returns Function A middleware function.
 */
ApiBuilder.prototype.route = function(definition) {
  var logger = this.logger;
  return function(req, res, next) {

    // Create the helper.
    var helper = exports.helper(req, res, next, logger);

    Promise.resolve().then(function() {

      // Call the definition function.
      var result = definition(req, res, helper);

      // Throw an error if it does not return a promise.
      if (result === undefined) {
        throw new Error('Routes defined with ApiBuilder#route must return a value or promise');
      }

      return result;
    }).catch(next);
  };
};

/**
 * Creates a middleware function that will fetch the record identified by the current URL and attach it to the request.
 * If no record is found, an HTTP 404 Not Found response will be sent.
 *
 * @param {String} resourceName - The name of the API resource (used in error messages).
 * @returns Function A middleware function.
 */
ApiBuilder.prototype.fetcher = function(resourceName, queryHandler, name) {

  var Model = this.model;

  return function(req, res, next) {

    var apiId = req.params.id;

    let query = new Model({ api_id: apiId });
    if (_.isFunction(queryHandler)) {
      query = queryHandler(query, req);
    }

    query.fetch().then(function(record) {
      if (!record) {
        throw errors.recordNotFound(resourceName, apiId);
      }

      // TODO: use resource name by default
      req[name || 'record'] = record;
      next();
    }).catch(next);
  };
};

exports.helper = function(req, res, next, logger) {
  var helper = new ApiHelper(req, res, next, logger);
  _.bindAll(helper, 'created', 'ok', 'noContent', 'respond', 'serialize', 'serializer');
  return helper;
};

function ApiHelper(req, res, next, logger) {
  this.req = req;
  this.res = res;
  this.next = next;
  this.logger = logger;
}

ApiHelper.prototype.validate = function(value, callback, status) {
  return valdsl(function() {
    return this.validate(this.value(value), this.while(this.hasNoError(this.atCurrentLocation())), callback);
  }).catch(function(err) {
    if (err.errors && !_.has(err, 'status')) {
      err.status = status;
    }

    return Promise.reject(err);
  });
};

ApiHelper.prototype.validateRequest = function(callback, status) {
  return this.validate(this.req, callback, status || 422);
};

ApiHelper.prototype.validateRequestBody = function() {
  var callbacks = _.toArray(arguments);
  return this.validate(this.req, function() {
    callbacks = [ this.get('body'), this.type('object') ].concat(callbacks);
    return this.validate.apply(this, callbacks);
  }, 422);
};

ApiHelper.prototype.respond = function(record, policy, callback) {
  return Promise
    .resolve(record)
    .then(this.serializer(policy))
    .then(callback || _.identity)
    .then(this.ok());
};

ApiHelper.prototype.created = function() {
  var res = this.res;
  return function(data) {
    res.status(201).json(data);
  };
};

ApiHelper.prototype.ok = function() {
  var res = this.res;
  return function(data) {
    res.json(data);
  };
};

ApiHelper.prototype.noContent = function() {
  var res = this.res;
  return function(data) {
    res.sendStatus(204);
  };
};

ApiHelper.prototype.serialize = function(record, policy) {
  var serialize = _.isFunction(policy.serialize) ? policy.serialize : policy;
  return serialize(record, this.req);
};

ApiHelper.prototype.serializer = function(policy) {
  var serialize = this.serialize;
  return function(record) {
    return serialize(record, policy);
  };
};

ApiHelper.prototype.unserializeTo = function(record, properties, source) {
  source = source || this.req.body;

  if (_.isArray(properties)) {
    properties = _.reduce(properties, function(memo, property) {
      memo[inflection.underscore(property)] = property;
      return memo;
    }, {});
  }

  _.each(properties, function(recordProperty, sourceProperty) {
    if (_.has(source, sourceProperty)) {
      record.set(recordProperty, source[sourceProperty]);
    }
  });
};
