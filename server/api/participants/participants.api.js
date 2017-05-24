const _ = require('lodash');
const api = require('../utils');
const Excursion = require('../../models/excursion');
const fetcher = require('../fetcher');
const policy = require('./participants.policy');
const QueryBuilder = require('../query-builder');
const Participant = require('../../models/participant');
const route = require('../route');
const serialize = require('../serialize');
const Trail = require('../../models/trail');
const transaction = require('../transaction');
const validate = require('../validate');
const validations = require('./participants.validations');

const builder = api.builder(Participant, 'participants');

// API resource name (used in some API errors)
exports.resourceName = 'participant';

exports.create = route.transactional(function*(req, res) {
  yield validateParticipant(req);

  const participant = Participant.parse(req);
  participant.set('excursion_id', req.excursion.get('id'));

  yield participant.save();
  res.status(201).send(serialize(req, participant, policy));
});

exports.list = route(function*(req, res) {

  const query = policy.scope(req).where('excursion_id', req.excursion.get('id'));
  const participants = yield new QueryBuilder(req, res, query)
    .paginate()
    .sort('createdAt', 'updatedAt')
    .eagerLoad([ 'excursion' ])
    .fetch();

  res.send(serialize(req, participants, policy));
});

exports.update = route.transactional(function*(req, res) {
  yield validateParticipant(req, true);
  policy.parseRequestIntoRecord(req, req.participant);
  yield req.participant.save();
  res.send(serialize(req, req.participant, policy));
});

exports.delete = route.transactional(function*(req, res) {
  yield req.participant.destroy();
  res.sendStatus(204);
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
