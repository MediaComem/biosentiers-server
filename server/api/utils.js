var _ = require('lodash'),
    auth = require('./auth'),
    config = require('../../config'),
    errors = require('./errors'),
    Promise = require('bluebird'),
    valdsl = require('valdsl');

exports.notYetImplemented = function(req, res) {
  res.sendStatus(418);
};

exports.authorize = auth.authorize;

exports.builder = function(model, name) {
  return new ApiBuilder(model, name);
};

function ApiBuilder(model, name) {
  this.model = model;
  this.logger = config.logger('api:' + name);
}

ApiBuilder.prototype.route = function(definition) {
  var logger = this.logger;
  return function(req, res, next) {
    var helper = exports.helper(req, res, next, logger);
    Promise.resolve().then(function() {

      var result = definition(req, res, helper);
      if (result === undefined) {
        throw new Error('Routes defined with ApiBuilder#route must return a value or promise');
      }

      return result;
    }).catch(next);
  };
};

ApiBuilder.prototype.fetcher = function(resourceName) {

  var model = this.model;

  return function(req, res, next) {

    var apiId = req.params.id;

    new model({
      api_id: apiId
    }).fetch().then(function(record) {
      if (!record) {
        throw errors.recordNotFound(resourceName, apiId);
      }

      req.record = record;
      next();
    }).catch(next);
  };
};

exports.helper = function(req, res, next, logger) {
  var helper = new ApiHelper(req, res, next, logger);
  _.bindAll(helper, 'created', 'ok', 'respond', 'serialize', 'serializer');
  return helper;
};

function ApiHelper(req, res, next, logger) {
  this.req = req;
  this.res = res;
  this.next = next;
  this.logger = logger;
}

ApiHelper.prototype.validate = function(value, callback) {
  return valdsl(function() {
    return this.validate(this.value(value), this.unlessError(this.atCurrentLocation()), callback);
  });
};

ApiHelper.prototype.validateRequest = function(callback) {
  return this.validate(this.req, callback);
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
