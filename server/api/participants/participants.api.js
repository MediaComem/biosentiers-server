var _ = require('lodash'),
    api = require('../utils'),
    Excursion = require('../../models/excursion'),
    fetcher = require('../fetcher'),
    policy = require('./participants.policy'),
    QueryBuilder = require('../query-builder'),
    Participant = require('../../models/participant'),
    Trail = require('../../models/trail'),
    validations = require('./participants.validations');

var builder = api.builder(Participant, 'participants');

// API resource name (used in some API errors).
exports.name = 'participant';

exports.create = builder.route(function(req, res, helper) {
  return validateParticipant(helper).then(create);

  function create() {
    return Participant.transaction(function() {

      const participant = Participant.parse(req);
      participant.set('excursion_id', req.excursion.get('id'));

      return participant
        .save()
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

exports.list = builder.route(function(req, res, helper) {
  const query = policy.scope(req).where('excursion_id', req.excursion.get('id'));
  return new QueryBuilder(req, res, query)
    .paginate()
    .sort('createdAt', 'updatedAt')
    .fetch()
    .map(participant => participant.load([ 'excursion' ]))
    .map(helper.serializer(policy))
    .then(helper.ok());
});

exports.update = builder.route(function(req, res, helper) {

  var participant = req.participant;
  return validateParticipant(helper, true).then(update);

  function update() {
    helper.unserializeTo(participant, [ 'name' ]);

    return participant
      .save()
      .then(helper.serializer(policy))
      .then(helper.ok());
  }
});

exports.delete = builder.route(function(req, res, helper) {
  return req.participant
    .destroy()
    .then(helper.noContent());
});

exports.fetchParticipant = fetcher({
  model: Participant,
  resourceName: 'participant',
  queryHandler: (query, req) => query.where('excursion_id', req.excursion.get('id'))
})

function validateParticipant(helper, patchMode) {

  var excursion = helper.req.excursion,
      participant = helper.req.participant,
      name = participant ? participant.get('name') : '';

  return helper.validateRequestBody(function() {
    return this.parallel(
      this.validate(this.json('/name'), this.if(patchMode, this.while(this.hasChanged(name))), this.presence(), this.type('string'), validations.nameAvailable(excursion, participant))
    );
  });
}

function fetchExcursionByApiId(apiId) {
  return new Excursion({
    api_id: apiId
  }).fetch();
}
