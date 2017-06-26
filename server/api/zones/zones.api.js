const _ = require('lodash');
const db = require('../../db');
const policy = require('./zones.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Zone = require('../../models/zone');

// API resource name (used in some API errors)
exports.resourceName = 'zone';

exports.list = route(function*(req, res) {

  const query = policy.scope(req).where('trail_id', req.trail.get('id'));
  const zones = yield new QueryBuilder(req, res, query)
    .paginate()
    .sort('position')
    .modify(q => { return { query: q.query(qb => qb.select('*', db.st.asGeoJSON('geom'))) }; })
    .fetch();

  res.send(serialize(req, zones, policy));
});
