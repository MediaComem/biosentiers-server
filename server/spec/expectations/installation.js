const _ = require('lodash');
const base64Regexp = require('base64-regex');
const db = require('../../db');
const expect = require('../chai').expect;
const Installation = require('../../models/installation');
const moment = require('moment');
const spec = require('../utils');

module.exports = spec.enrichExpectation(function(actual, expected) {

  // Check the actual object.
  expect(actual, 'installation').to.be.an('object');

  const keys = [ 'id', 'href', 'properties', 'createdAt', 'updatedAt' ];
  if (expected.sharedSecret) {
    keys.push('sharedSecret');
  }

  expect(actual, 'res.body').to.have.all.keys(keys);

  expect(actual.id, 'installation.id').to.be.a('string');
  expect(actual.href, 'installation.href').to.equal(expected.href || `/api/installations/${actual.id}`);
  expect(actual.properties, 'installation.properties').to.eql(expected.properties);

  if (expected.sharedSecret) {
    expect(actual.sharedSecret, 'installation.sharedSecret').to.be.a('string');
    expect(actual.sharedSecret, 'installation.sharedSecret').to.match(base64Regexp());
    expect(actual.sharedSecret, 'installation.sharedSecret').to.have.lengthOf(344);
    if (expected.sharedSecret !== true) {
      expect(actual.sharedSecret, 'installation.sharedSecret').to.equal(expected.sharedSecret);
    }
  }

  spec.expectTimestamp('installation', actual, expected, 'created');
  spec.expectTimestamp('installation', actual, expected, 'updated');

  // Check that the corresponding installation exists in the database.
  return module.exports.inDb(actual.id, _.extend({}, actual, _.pick(expected, 'sharedSecret')));
});

module.exports.inDb = function(apiId, expected) {
  const query = new Installation({ api_id: apiId }).fetch();
  return query.then(function(installation) {
    expect(installation, 'db.installation').to.be.an.instanceof(Installation);
    expect(installation.get('id'), 'db.installation.id').to.be.a('string');
    expect(installation.get('api_id'), 'db.installation.api_id').to.equal(expected.id);
    expect(installation.get('properties'), 'db.installation.properties').to.eql(expected.properties);
    expect(installation.get('created_at'), 'db.installation.created_at').to.be.sameMoment(expected.createdAt);
    expect(installation.get('updated_at'), 'db.installation.updated_at').to.be.sameMoment(expected.updatedAt);

    expect(installation.get('shared_secret'), 'db.installation.shared_secret').to.be.an.instanceof(Buffer);
    expect(installation.get('shared_secret').toString('hex'), 'db.installation.shared_secret').to.match(/^[0-9a-f]{512}$/);
    if (expected.sharedSecret !== undefined && expected.sharedSecret !== true && expected.sharedSecret !== false) {
      expect(installation.get('shared_secret').toString('hex'), 'db.installation.shared_secret').to.equal(new Buffer(expected.sharedSecret, 'base64').toString('hex'));
    }
  });
};