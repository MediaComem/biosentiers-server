const _ = require('lodash');
const expect = require('../chai').expect;
const spec = require('../utils');
const Excursion = require('../../models/excursion');

const expectIfElse = spec.expectIfElse;

module.exports = spec.enrichExpectation(function(actual, expected) {

  // Check the actual object.
  expect(actual, 'excursion').to.be.an('object');

  const keys = [
    'id', 'href',
    'themes', 'zoneHrefs', 'trailHref', 'plannedAt',
    'participantsHref', 'participantsCount',
    'creatorHref', 'createdAt', 'updatedAt'
  ];

  if (_.has(expected, 'name')) {
    keys.push('name');
  }

  expect(actual, 'res.body').to.have.all.keys(keys);

  expect(actual.id, 'excursion.id').to.be.a('string');
  if (expected.id) {
    expect(actual.id, 'excursion.id').to.equal(expected.id);
  }

  expect(actual.href, 'excursion.href').to.equal(`/api/excursions/${actual.id}`);

  let expectedTrailHref = expected.trailHref;
  if (!expectedTrailHref) {
    const expectedTrailId = expected.trail ? expected.trail.get('api_id') : expected.trailId;
    expectedTrailHref = `/api/trails/${expectedTrailId}`;
  }

  expect(actual.trailHref, 'excursion.trailHref').to.equal(expectedTrailHref);

  let expectedCreatorHref = expected.creatorHref;
  if (!expectedCreatorHref) {
    const expectedCreatorId = expected.creator ? expected.creator.get('api_id') : expected.creatorId;
    expectedCreatorHref = `/api/users/${expectedCreatorId}`;
  }

  expect(actual.creatorHref, 'excursion.creatorHref').to.equal(expectedCreatorHref);

  expect(actual.participantsHref, 'excursion.participantsHref').to.equal(`/api/excursions/${actual.id}/participants`);
  expect(actual.name, 'excursion.name').to.equal(expected.name);
  expect(actual.themes.sort(), 'excursion.themes').to.eql(_.get(expected, 'themes', []).sort());
  expect(actual.zoneHrefs.sort(), 'excursion.zoneHrefs').to.eql(_.get(expected, 'zoneHrefs', []).sort());

  spec.expectTimestamp('excursion', actual, expected, 'planned', { required: false });
  spec.expectTimestamp('excursion', actual, expected, 'created');
  spec.expectTimestamp('excursion', actual, expected, 'updated');

  // Check that the corresponding excursion exists in the database.
  return module.exports.db(actual);
});

module.exports.db = async function(expected) {

  const excursion = await spec.checkRecord(Excursion, expected);
  expect(excursion, 'db.excursion').to.be.an.instanceof(Excursion);

  expect(excursion.get('id'), 'db.excursion.id').to.be.a('string');
  expect(excursion.get('api_id'), 'db.excursion.api_id').to.equal(expected.id);
  expect(excursion.get('name'), 'db.excursion.name').to.equal(_.get(expected, 'name', null));
  expect(excursion.get('created_at'), 'db.excursion.created_at').to.be.sameMoment(expected.createdAt);
  expect(excursion.get('updated_at'), 'db.excursion.updated_at').to.be.sameMoment(expected.updatedAt);
  expectIfElse(excursion.get('planned_at'), 'db.excursion.planned_at', expected.plannedAt, y => y.to.be.sameMoment(expected.plannedAt), n => n.to.be.null);

  await excursion.load([ 'themes', 'zones']);

  const themeNames = excursion.related('themes').pluck('name').sort();
  expect(themeNames, 'db.excursion.themes').to.eql(_.get(expected, 'themes', []).sort());

  const zoneHrefs = excursion.related('zones').pluck('href').sort();
  expect(zoneHrefs, 'db.excursion.zones').to.eql(_.get(expected, 'zoneHrefs', []).sort());
};
