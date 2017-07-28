const _ = require('lodash');
const fetcher = require('../fetcher');
const InstallationEvent = require('../../models/installation-event');
const np = require('../../lib/native-promisify');
const policy = require('./installation-events.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const validate = require('../validate');

// API resource name (used in some API errors)
exports.resourceName = 'installation event';

exports.create = route.transactional(async function(req, res) {
  await np(validateInstallationEvent(req));

  const installationEvent = policy.parse(req);
  installationEvent.set('installation_id', req.installation.get('id'));
  await installationEvent.save();

  res.status(201).send(await serialize(req, installationEvent, policy, { sharedSecret: true }));
});

exports.list = route(async function(req, res) {

  const installationEvents = await new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sorts('type', 'createdAt', 'occurredAt')
    .defaultSort('createdAt', 'desc')
    .fetch();

  res.send(await serialize(req, installationEvents, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(await serialize(req, req.installationEvent, policy));
});

exports.fetchInstallationEvent = fetcher({
  model: InstallationEvent,
  resourceName: 'installationEvent'
});

function validateInstallationEvent(req, patchMode) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/type'),
        this.type('string'),
        this.notBlank()
      ),
      this.validate(
        this.json('/occurredAt'),
        this.type('string'),
        this.notBlank()
      )
    );
  });
}
