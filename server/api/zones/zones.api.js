const _ = require('lodash');
const db = require('../../db');
const policy = require('./zones.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');

// API resource name (used in some API errors)
exports.resourceName = 'zone';

exports.list = route(async function(req, res) {

  const query = policy.scope(req.trail.zones());
  const zones = await new QueryBuilder(req, res, query)
    .paginate()
    .sort('position')
    .eagerLoad({ trails: (qb) => qb.select('trail.*', db.st.asGeoJSON('geom')), points: (qb) => qb.select('*', db.st.asGeoJSON('geom')) })
    .modify(q => { return { query: q.query(qb => qb.select('zone.*', db.st.asGeoJSON('geom'))) }; })
    .fetch();

  res.send(await serialize(req, zones, policy));
});
