const _ = require('lodash');
const db = require('../../db');
const expect = require('../chai').expect;
const Installation = require('../../models/installation');
const InstallationEvent = require('../../models/installation-event');
const spec = require('../utils');

module.exports = spec.enrichExpectation(function(actual, expected) {

  // Check the actual object.
  expect(actual, 'installation-event').to.be.an('object');

  const keys = [ 'id', 'href', 'installationHref', 'type', 'version', 'properties', 'createdAt', 'occurredAt' ];
  expect(actual, 'res.body').to.have.all.keys(keys);

  expect(actual.id, 'installation-event.id').to.be.a('string');
  expect(actual.href, 'installation-event.href').to.equal(expected.href || `/api/installation-events/${actual.id}`);
  expect(actual.type, 'installation-event.type').to.equal(expected.type);
  expect(actual.version, 'installation-event.version').to.equal(expected.version);
  expect(actual.properties, 'installation-event.properties').to.eql(expected.properties);

  let expectedInstallationHref = expected.installationHref;
  if (!expectedInstallationHref) {
    const expectedInstallationId = expected.installation ? expected.installation.get('api_id') : expected.installationId;
    expectedInstallationHref = `/api/installations/${expectedInstallationId}`;
  }

  expect(actual.installationHref, 'installation-event.installationHref').to.equal(expectedInstallationHref);

  spec.expectTimestamp('installation-event', actual, expected, 'created');
  spec.expectTimestamp('installation-event', actual, expected, 'occurred');

  // Check that the corresponding installation event exists in the database.
  return module.exports.inDb(actual.id, _.extend({}, actual, _.pick(expected, 'installation', 'installationId')));
});

module.exports.inDb = async function(apiId, expected) {
  const event = await new InstallationEvent({ api_id: apiId }).fetch();

  let installation = expected.installation;
  if (!installation) {
    installation = await new Installation({ api_id: expected.installationId }).fetch()
  }

  expect(event, 'db.installation-event').to.be.an.instanceof(InstallationEvent);
  expect(event.get('id'), 'db.installation-event.id').to.be.a('string');
  expect(event.get('api_id'), 'db.installation-event.api_id').to.equal(expected.id);
  expect(event.get('installation_id'), 'db.installation-event.installation_id').to.equal(installation.get('id'));
  expect(event.get('type'), 'db.installation-event.type').to.equal(expected.type);
  expect(event.get('version'), 'db.installation-event.version').to.equal(expected.version);
  expect(event.get('properties'), 'db.installation-event.properties').to.eql(expected.properties);
  expect(event.get('created_at'), 'db.installation-event.created_at').to.be.sameMoment(expected.createdAt);
  expect(event.get('occurred_at'), 'db.installation-event.occurred_at').to.be.sameMoment(expected.occurredAt);
};
