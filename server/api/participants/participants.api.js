const _ = require('lodash');
const api = require('../utils');
const Excursion = require('../../models/excursion');
const fetcher = require('../fetcher');
const policy = require('./participants.policy');
const QueryBuilder = require('../query-builder');
const Participant = require('../../models/participant');
const route = require('../route');
const Trail = require('../../models/trail');
const validate = require('../validate');
const validations = require('./participants.validations');

const builder = api.builder(Participant, 'participants');

// API resource name (used in some API errors)
exports.resourceName = 'participant';

exports.create = route(function*(req, res, next, helper) {
  yield validateParticipant(req);

  const participant = yield Participant.transaction(function() {

    const newParticipant = Participant.parse(req);
    newParticipant.set('excursion_id', req.excursion.get('id'));

    return newParticipant.save();
  });

  return helper.created(participant, policy);
});

exports.list = route(function*(req, res, next, helper) {

  const query = policy.scope(req).where('excursion_id', req.excursion.get('id'));
  const participants = yield new QueryBuilder(req, res, query)
    .paginate()
    .sort('createdAt', 'updatedAt')
    .eagerLoad([ 'excursion' ])
    .fetch();

  return helper.ok(participants, policy);
});

exports.update = route(function*(req, res, next, helper) {
  yield validateParticipant(req, true);
  policy.parseRequestIntoRecord(req, req.participant);
  yield req.participant.save();
  helper.ok(req.participant, policy);
});

exports.delete = route(function*(req, res, next, helper) {
  yield req.participant.destroy();
  helper.noContent();
});

exports.fetchParticipant = fetcher({
  model: Participant,
  resourceName: exports.resourceName,
  queryHandler: (query, req) => query.where('excursion_id', req.excursion.get('id'))
});

function validateParticipant(req, patchMode) {

  const excursion = req.excursion;
  const participant = req.participant;
  const name = participant ? participant.get('name') : '';

  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/name'),
        this.if(patchMode, this.while(this.isSet()), this.while(this.hasChanged(name))),
        this.presence(),
        this.type('string'),
        validations.nameAvailable(excursion, participant)
      )
    );
  });
}

function fetchExcursionByApiId(apiId) {
  return new Excursion({
    api_id: apiId
  }).fetch();
}
