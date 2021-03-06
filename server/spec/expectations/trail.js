const _ = require('lodash');
const db = require('../../db');
const expect = require('../chai').expect;
const spec = require('../utils');
const Trail = require('../../models/trail');

module.exports = spec.enrichExpectation(function(actual, expected) {

  // Check the actual object.
  expect(actual, 'trail').to.be.an('object');

  const keys = [ 'id', 'href', 'name', 'geometry', 'length', 'createdAt', 'updatedAt' ];
  expect(actual, 'res.body').to.have.all.keys(keys);

  expect(actual.id, 'trail.id').to.be.a('string');
  if (expected.id) {
    expect(actual.id, 'trail.id').to.equal(expected.id);
  }

  expect(actual.href, 'trail.href').to.equal(expected.href || `/api/trails/${actual.id}`);
  expect(actual.name, 'trail.name').to.equal(expected.name);
  expect(actual.geometry, 'trail.geometry').to.eql(expected.geometry);
  expect(actual.length, 'trail.length').to.equal(expected.length);

  spec.expectTimestamp('trail', actual, expected, 'created');
  spec.expectTimestamp('trail', actual, expected, 'updated');

  // Check that the corresponding trail exists in the database.
  return module.exports.db(actual);
});

module.exports.db = async function(expected) {

  const trail = await spec.checkRecord(Trail, expected);
  expect(trail, 'db.trail').to.be.an.instanceof(Trail);

  expect(trail.get('id'), 'db.trail.id').to.be.a('string');
  expect(trail.get('api_id'), 'db.trail.api_id').to.equal(expected.id);
  expect(trail.get('name'), 'db.trail.name').to.equal(expected.name);
  expect(trail.get('geom'), 'db.trail.geom').to.eql(expected.geometry);
  expect(trail.get('path_length'), 'db.trail.path_length').to.equal(expected.length);
  expect(trail.get('created_at'), 'db.trail.created_at').to.be.sameMoment(expected.createdAt);
  expect(trail.get('updated_at'), 'db.trail.updated_at').to.be.sameMoment(expected.updatedAt);
};
