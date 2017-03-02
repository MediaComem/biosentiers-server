var _ = require('lodash'),
    api = require('../utils'),
    Excursion = require('../../models/excursion'),
    policy = require('./participants.policy'),
    QueryBuilder = require('../query-builder'),
    Participant = require('../../models/participant'),
    Trail = require('../../models/trail'),
    validations = require('./participants.validations');

var builder = api.builder(Participant, 'participants');

// API resource name (used in some API errors).
exports.name = 'participant';

exports.create = builder.route(function(req, res, helper) {
  return validate().then(create);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/name'), this.presence(), this.type('string'), validations.nameAvailable())
      );
    });
  }

  function create() {
    return Participant.transaction(function() {

      const participant = Participant.parse(req);
      participant.set('excursion_id', req.record.get('id'));

      return participant
        .save()
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

exports.list = builder.route(function(req, res, helper) {
  const query = policy.scope(req).where('excursion_id', req.record.get('id'));
  return new QueryBuilder(req, res, query)
    .paginate()
    .sort('createdAt', 'updatedAt')
    .fetch()
    .map(participant => participant.load([ 'excursion' ]))
    .map(helper.serializer(policy))
    .then(helper.ok());
});

exports.update = builder.route(function(req, res, helper) {

  var participant = req.record;
  return validate().then(update);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/name'), this.ifChanged(), this.presence(), this.type('string'), validations.nameAvailable(participant))
      );
    });
  }

  function update() {
    helper.unserializeTo(participant, [ 'name' ]);

    return participant
      .save()
      .then(helper.serializer(policy))
      .then(helper.ok());
  }
});

exports.fetchRecord = builder.fetcher(exports.name, (query, req) => query.where('excursion_id', req.record.get('id')));

function fetchExcursionByApiId(apiId) {
  return new Excursion({
    api_id: apiId
  }).fetch();
}
