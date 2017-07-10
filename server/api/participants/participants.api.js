const _ = require('lodash');
const Excursion = require('../../models/excursion');
const fetcher = require('../fetcher');
const np = require('../../lib/native-promisify');
const policy = require('./participants.policy');
const QueryBuilder = require('../query-builder');
const Participant = require('../../models/participant');
const route = require('../route');
const serialize = require('../serialize');
const Trail = require('../../models/trail');
const validate = require('../validate');
const validations = require('./participants.validations');

const EAGER_LOAD = [ 'excursion' ];

// API resource name (used in some API errors)
exports.resourceName = 'participant';

exports.create = route.transactional(async function(req, res) {
  await np(validateParticipant(req));

  const participant = policy.parse(req);
  participant.set('excursion_id', req.excursion.get('id'));

  await participant.load(EAGER_LOAD);
  await participant.save();
  res.status(201).send(await serialize(req, participant, policy));
});

exports.list = route(async function(req, res) {

  const query = policy.scope(req).where('excursion_id', req.excursion.get('id'));
  const participants = await new QueryBuilder(req, res, query)
    .paginate()
    .sort('createdAt', 'updatedAt')
    .eagerLoad(EAGER_LOAD)
    .fetch();

  res.send(await serialize(req, participants, policy));
});

exports.update = route.transactional(async function(req, res) {
  await np(validateParticipant(req, true));
  policy.parse(req, req.participant);
  await req.participant.save();
  res.send(await serialize(req, req.participant, policy));
});

exports.delete = route.transactional(async function(req, res) {
  await req.participant.destroy();
  res.sendStatus(204);
});

exports.fetchParticipant = fetcher({
  model: Participant,
  resourceName: exports.resourceName,
  eagerLoad: EAGER_LOAD,
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
        this.if(patchMode, this.while(this.isSet()), this.while(this.changed(name))),
        this.required(),
        this.type('string'),
        this.notBlank(),
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
