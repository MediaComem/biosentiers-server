const _ = require('lodash');
const api = require('../utils');
const Excursion = require('../../models/excursion');
const fetcher = require('../fetcher');
const policy = require('./participants.policy');
const QueryBuilder = require('../query-builder');
const Participant = require('../../models/participant');
const Trail = require('../../models/trail');
const validations = require('./participants.validations');

const builder = api.builder(Participant, 'participants');

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

  const participant = req.participant;
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

  const excursion = helper.req.excursion;
  const participant = helper.req.participant;
  const name = participant ? participant.get('name') : '';

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
