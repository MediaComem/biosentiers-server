var _ = require('lodash'),
    api = require('../utils'),
    Excursion = require('../../models/excursion'),
    policy = require('./excursions.policy'),
    QueryBuilder = require('../query-builder'),
    Trail = require('../../models/trail');

var builder = api.builder(Excursion, 'excursions');

// API resource name (used in some API errors).
exports.name = 'excursion';

exports.create = builder.route(function(req, res, helper) {

  return validate().then(create);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/trailId'), this.presence(), this.type('string'), this.resource(fetchTrailByApiId).replace(trail => trail.get('id'))),
        this.validate(this.json('/plannedAt'), this.presence(), this.type('string'))
      );
    });
  }

  function create() {
    return Excursion.transaction(function() {
      return Excursion.parse(req)
        .save()
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

exports.list = builder.route(function(req, res, helper) {
  return new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sort('createdAt', 'plannedAt', 'updatedAt')
    .eagerLoad([ 'trail' ])
    .fetch()
    .map(helper.serializer(policy))
    .then(helper.ok());
});

exports.retrieve = builder.route(function(req, res, helper) {
  return Promise
    .resolve(req.record.load([ 'trail' ]))
    .then(helper.serializer(policy))
    .then(helper.ok());
});

exports.fetchRecord = builder.fetcher(exports.name);

function fetchTrailByApiId(apiId) {
  return new Trail({
    api_id: apiId
  }).fetch();
}
