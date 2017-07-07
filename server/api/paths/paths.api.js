const _ = require('lodash');
const db = require('../../db');
const policy = require('./paths.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');

// API resource name (used in some API errors)
exports.resourceName = 'path';

exports.list = route(async function(req, res) {

  const query = policy.scope(req).where('trail_id', req.trail.get('id'));
  const paths = await new QueryBuilder(req, res, query)
    .paginate()
    .sort('position')
    .modify(q => { return { query: q.query(qb => qb.select('*', db.st.asGeoJSON('geom'))) }; })
    .eagerLoad([ 'type' ])
    .fetch();

  res.send(await serialize(req, paths, policy));
});
