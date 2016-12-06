var _ = require('lodash'),
    expect = require('../chai').expect,
    moment = require('moment'),
    spec = require('../utils'),
    Excursion = require('../../models/excursion');

module.exports = spec.enrichExpectation(function(actual, expected) {

  // Check the actual object.
  expect(actual, 'excursion').to.be.an('object');

  var keys = [ 'id', 'trailId', 'plannedAt', 'createdAt', 'updatedAt' ];
  expect(actual, 'res.body').to.have.all.keys(keys);

  expect(actual.id, 'excursion.id').to.be.a('string');
  expect(actual.trailId, 'excursion.trailId').to.equal(expected.trail ? expected.trail.get('api_id') : expected.trailId);

  spec.expectTimestamp(actual, expected, 'planned');
  spec.expectTimestamp(actual, expected, 'created');
  spec.expectTimestamp(actual, expected, 'updated');

  // Check that the corresponding excursion exists in the database.
  return module.exports.inDb(actual.id, actual);
});

module.exports.inDb = function(apiId, expected) {
  return new Excursion({ api_id: apiId }).fetch().then(function(excursion) {
    expect(excursion, 'db.excursion').to.be.an.instanceof(Excursion);
    expect(excursion.get('id'), 'db.excursion.id').to.be.a('string');
    expect(excursion.get('api_id'), 'db.excursion.api_id').to.equal(expected.id);
    expect(excursion.get('name'), 'db.excursion.name').to.equal(expected.name);
    expect(excursion.get('created_at'), 'db.excursion.created_at').to.be.sameMoment(expected.createdAt);
    expect(excursion.get('updated_at'), 'db.excursion.updated_at').to.be.sameMoment(expected.updatedAt);
  });
};
