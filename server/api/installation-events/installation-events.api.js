const _ = require('lodash');
const fetcher = require('../fetcher');
const Installation = require('../../models/installation');
const InstallationEvent = require('../../models/installation-event');
const moment = require('moment');
const np = require('../../lib/native-promisify');
const policy = require('./installation-events.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const { setRelated } = require('../../lib/models');
const validate = require('../validate');
const validations = require('../lib/validations');

const BULK_CREATE_MAX = 100;
const BULK_CREATE_EXISTING_EVENTS_CHECK_BATCH_SIZE = 100;

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

  await omitExistingEvents(events);

  if (events.length) {
    await Promise.all([
      InstallationEvent.bulkCreate(events),
      req.installation.updateEventsMetadata(events)
    ]);

    events.forEach(event => setRelated(event, 'installation', req.installation));
  }

  res.status(events.length ? 201 : 200).send(await serialize(req, multiple ? events : events[0], policy));
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

async function omitExistingEvents(events) {
  if (events.length <= 1) {
    return events;
  }

  const installationId = events[0].get('installation_id');
  const types = _.uniq(_.map(events, event => event.get('type')));
  const minDate = _.minBy(events, event => event.get('occurred_at')).get('occurred_at');
  const maxDate = _.maxBy(events, event => event.get('occurred_at')).get('occurred_at');

  let query = new InstallationEvent()
    .where('installation_id', installationId)
    .where('type', 'IN', types);

  if (minDate == maxDate) {
    query = query.where('occurred_at', minDate);
  } else {
    query = query
      .where('occurred_at', '>=', minDate)
      .where('occurred_at', '<=', maxDate);
  }

  let count = await query.clone().count();
  if (!count) {
    return events;
  }

  let offset = 0;
  while (count >= 1) {
    const existingEvents = await query
      .clone()
      .orderBy('id')
      .query(qb => qb.offset(offset).limit(BULK_CREATE_EXISTING_EVENTS_CHECK_BATCH_SIZE))
      .fetchAll();

    existingEvents.forEach(existingEvent => {
      const matchingEvent = events.find(event => {
        return event.get('type') == existingEvent.get('type') && moment(event.get('occurred_at')).isSame(moment(existingEvent.get('occurred_at')));
      });

      if (matchingEvent) {
        _.pull(events, matchingEvent);
      }
    });

    count -= BULK_CREATE_EXISTING_EVENTS_CHECK_BATCH_SIZE;
    offset += BULK_CREATE_EXISTING_EVENTS_CHECK_BATCH_SIZE;
  }

  return events;
}

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
    validations.array(1, BULK_CREATE_MAX),
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
