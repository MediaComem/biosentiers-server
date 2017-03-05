var _ = require('lodash'),
    api = require('../utils'),
    policy = require('./trails.policy'),
    QueryBuilder = require('../query-builder'),
    Trail = require('../../models/trail');

var builder = api.builder(Trail, 'trails');

// API resource name (used in some API errors).
exports.name = 'trail';

exports.create = builder.route(function(req, res, helper) {

  return validate().then(create);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/name'), this.presence(), this.type('string'))
      );
    });
  }

  function create() {
    return Trail.transaction(function() {
      var record = Trail.parse(req);
      return record
        .save()
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

exports.list = builder.route(function(req, res, helper) {
  return new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sort('createdAt', 'updatedAt')
    .fetch()
    .map(helper.serializer(policy))
    .then(helper.ok());
});