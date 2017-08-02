const _ = require('lodash');
const db = require('../../db');
const fetcher = require('../fetcher');
const InstallationEvent = require('../../models/installation-event');
const np = require('../../lib/native-promisify');
const policy = require('./installation-events.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const { setRelated } = require('../../lib/models');
const validate = require('../validate');
const validations = require('../lib/validations');

const BULK_CREATE_MAX = 100;

const EAGER_LOAD = [
  'installation'
];

// API resource name (used in some API errors)
exports.resourceName = 'installation event';

exports.create = route.transactional(async function(req, res) {
  await np(validateInstallationEvent(req));

  const multiple = _.isArray(req.body);
  const rawEvents = multiple ? req.body : [ req.body ];

  const events = rawEvents.map(rawEvent => {
    const event = policy.parse(rawEvent);
    event.set('installation_id', req.installation.get('id'));
    return event;
  });

  await InstallationEvent.bulkCreate(events);
  events.forEach(event => setRelated(event, 'installation', req.installation));

  res.status(201).send(await serialize(req, multiple ? events : events[0], policy));
});

exports.list = route(async function(req, res) {
  const installationEvents = await createEventQueryBuilder(req, res, policy.scope(req)).fetch();
  res.send(await serialize(req, installationEvents, policy));
});

exports.listByInstallation = route(async function(req, res) {
  const baseQuery = policy.scope(req).where('installation_id', req.installation.get('id'));
  const installationEvents = await createEventQueryBuilder(req, res, baseQuery).fetch();
  res.send(await serialize(req, installationEvents, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(await serialize(req, req.installationEvent, policy));
});

exports.fetchInstallationEvent = fetcher({
  model: InstallationEvent,
  resourceName: 'installationEvent',
  eagerLoad: EAGER_LOAD
});

function createEventQueryBuilder(req, res, baseQuery) {
  return new QueryBuilder(req, res, baseQuery)
    .paginate()
    .sorts('type', 'createdAt', 'occurredAt')
    .defaultSort('occurredAt', 'desc')
    .eagerLoad(EAGER_LOAD);
}

function validateInstallationEvent(req) {

  const options = {
    types: [ 'array', 'object' ]
  };

  return validate.requestBody(req, function() {
    return this.ifElse(
      context => _.isArray(context.get('value')),
      validateManyInstallationEvents.bind(this),
      validateOneInstallationEvent.bind(this)
    );
  }, options);
}

function validateManyInstallationEvents() {
  return this.series(
    validations.array(0, BULK_CREATE_MAX),
    this.each((context, event, i) => {
      return this.validate(
        this.json(`/${i}`),
        validateOneInstallationEvent.bind(this)
      );
    })
  );
}

function validateOneInstallationEvent() {
  return this.parallel(
    this.validate(
      this.json('/type'),
      this.required(),
      this.type('string'),
      this.notBlank(),
      this.string(1, 255)
    ),
    this.validate(
      this.json('/version'),
      this.required(),
      this.type('string'),
      this.notBlank(),
      this.string(1, 25)
    ),
    this.validate(
      this.json('/properties'),
      this.while(this.isSet()),
      this.type('object')
    ),
    this.validate(
      this.json('/occurredAt'),
      this.required(),
      this.type('string'),
      validations.iso8601()
    )
  );
}
