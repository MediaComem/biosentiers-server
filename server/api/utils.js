var _ = require('lodash'),
    auth = require('../lib/auth'),
    config = require('../../config'),
    Promise = require('bluebird');

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
    var helper = exports.helper(req, res, logger);
    definition(req, res, next, helper);
  };
};

ApiBuilder.prototype.fetcher = function() {
  var model = this.model;
  return function(req, res, next) {
    new model({
      api_id: req.params.id
    }).fetch().then(function(record) {
      if (!record) {
        return res.sendStatus(404);
      }

      req.record = record;
      next();
    }).catch(next);
  };
};

exports.helper = function(req, res, logger) {
  var helper = new ApiHelper(req, res, logger);
  _.bindAll(helper, 'create', 'created', 'ok', 'respond', 'serialize', 'serializer');
  return helper;
};

function ApiHelper(req, res, logger) {
  this.req = req;
  this.res = res;
  this.logger = logger;
}

ApiHelper.prototype.create = function(record, policy, callback) {
  var serializer = this.serializer;
  return record.constructor.transaction(function() {
    return record
      .save()
      .then(callback || _.noop)
      .return(record)
      .then(serializer(policy));
  }).then(this.created());
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
