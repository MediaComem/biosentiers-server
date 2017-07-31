const _ = require('lodash');
const fetcher = require('../fetcher');
const InstallationEvent = require('../../models/installation-event');
const np = require('../../lib/native-promisify');
const policy = require('./installation-events.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const { setRelated } = require('../../lib/models');
const validate = require('../validate');

const EAGER_LOAD = [
  'installation'
];

// API resource name (used in some API errors)
exports.resourceName = 'installation event';

exports.create = route.transactional(async function(req, res) {
  await np(validateInstallationEvent(req));

  const installationEvent = policy.parse(req);
  installationEvent.set('installation_id', req.installation.get('id'));
  await installationEvent.save();
  setRelated(installationEvent, 'installation', req.installation);

  res.status(201).send(await serialize(req, installationEvent, policy, { sharedSecret: true }));
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

function validateInstallationEvent(req, patchMode) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/type'),
        this.required(),
        this.type('string'),
        this.notBlank()
      ),
      this.validate(
        this.json('/occurredAt'),
        this.required(),
        this.type('string'),
        this.notBlank()
      ),
      this.validate(
        this.json('/properties'),
        this.while(this.isSet()),
        this.type('object')
      )
    );
  });
}
