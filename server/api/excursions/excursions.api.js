var _ = require('lodash'),
    api = require('../utils'),
    Excursion = require('../../models/excursion'),
    policy = require('./excursions.policy'),
    Trail = require('../../models/trail');

var builder = api.builder(Excursion, 'excursions');

// API resource name (used in some API errors).
exports.name = 'excursion';

exports.create = builder.route(function(req, res, helper) {

  return validate().then(create);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/trailId'), this.presence(), this.type('string'), this.resource(fetchTrailByApiId).moveTo('/trail')),
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

function fetchTrailByApiId(apiId) {
  return new Trail({
    api_id: apiId
  }).fetch();
}
