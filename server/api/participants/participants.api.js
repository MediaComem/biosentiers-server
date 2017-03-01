var _ = require('lodash'),
    api = require('../utils'),
    Excursion = require('../../models/excursion'),
    policy = require('./participants.policy'),
    QueryBuilder = require('../query-builder'),
    Participant = require('../../models/participant'),
    Trail = require('../../models/trail');

var builder = api.builder(Participant, 'participants');

// API resource name (used in some API errors).
exports.name = 'participant';

exports.create = builder.route(function(req, res, helper) {

  return validate().then(create);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/name'), this.presence(), this.type('string')),
        this.validate(this.json('/excursionId'), this.presence(), this.type('string'), this.resource(fetchExcursionByApiId).moveTo('/trail'))
      );
    });
  }

  function create() {
    return Participant.transaction(function() {
      return Participant.parse(req)
        .save()
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

function fetchExcursionByApiId(apiId) {
  return new Excursion({
    api_id: apiId
  }).fetch();
}
