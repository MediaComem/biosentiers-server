const _ = require('lodash');
const api = require('../utils');
const policy = require('./trails.policy');
const QueryBuilder = require('../query-builder');
const Trail = require('../../models/trail');

const builder = api.builder(Trail, 'trails');

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
      return Trail.parse(req)
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
