const _ = require('lodash');
const db = require('../../db');
const fetcher = require('../fetcher');
const policy = require('./zones.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Zone = require('../../models/zone');

const EAGER_LOAD = {
  points: qb => qb.select('*', db.st.asGeoJSON('geom')),
  trails: qb => qb.select('trail.*', db.st.asGeoJSON('geom'))
};

// API resource name (used in some API errors)
exports.resourceName = 'zone';

exports.list = route(async function(req, res) {

  const query = policy.scope(req.trail.zones());
  const zones = await new QueryBuilder(req, res, query)
    .paginate()
    .sort('position')
    .eagerLoad(EAGER_LOAD)
    .modify(q => { return { query: q.query(qb => qb.select('zone.*', db.st.asGeoJSON('geom'))) }; })
    .fetch();

  res.send(await serialize(req, zones, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(await serialize(req, req.zone, policy));
});

exports.fetchZone = fetcher({
  model: Zone,
  resourceName: exports.resourceName,
  eagerLoad: EAGER_LOAD,
  queryHandler: query => query.query(qb => qb.select('*', db.st.asGeoJSON('geom')))
});
