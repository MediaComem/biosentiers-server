const _ = require('lodash');
const db = require('../../db');
const fetcher = require('../fetcher');
const hrefToApiId = require('../../lib/href').hrefToApiId;
const policy = require('./zones.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const sorting = require('../sorting');
const utils = require('../utils');
const Zone = require('../../models/zone');

const EAGER_LOAD = {
  points: qb => qb.select('*', db.st.asGeoJSON('geom')),
  trails: qb => qb.select('trail.*', db.st.asGeoJSON('geom'))
};

const TRAIL_PIVOT_JOINED = Symbol('trail-pivot-joined');

// API resource name (used in some API errors)
exports.resourceName = 'zone';

exports.list = route(async function(req, res) {

  const query = policy.scope();
  const zones = await new QueryBuilder(req, res, query)
    .filter(filterByHref)
    .paginate()
    .sorts('createdAt')
    .defaultSort('createdAt')
    .eagerLoad(EAGER_LOAD)
    .modify(q => { return { query: q.query(qb => qb.select('zone.*', db.st.asGeoJSON('geom'))) }; })
    .fetch();

  res.send(await serialize(req, zones, policy));
});

exports.listByTrail = route(async function(req, res) {

  const query = policy.scope(req.trail.zones());
  const zones = await new QueryBuilder(req, res, query)
    .filter(filterByHref)
    .paginate()
    .sorts('createdAt')
    .sort('position', sorting.sortByRelatedProperty('position', TRAIL_PIVOT_JOINED, { table: 'zone', relationTable: 'trails_zones', foreignKey: 'id', relationForeignKey: 'zone_id' }))
    .defaultSort('position')
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

function filterByHref(query, req) {

  const hrefs = utils.multiValueParam(req.query.href, _.isString, hrefToApiId);
  if (!hrefs.length) {
    return;
  }

  return query.query(qb => qb.where('zone.api_id', 'in', hrefs));
}
