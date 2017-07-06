const _ = require('lodash');
const db = require('../../db');
const policy = require('./pois.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');

// API resource name (used in some API errors)
exports.resourceName = 'poi';

exports.list = route(async function(req, res) {

  const query = policy.scope()
    .query(qb => {
      return qb
        .innerJoin('pois_zones', 'poi.id', 'pois_zones.poi_id')
        .innerJoin('zone', 'pois_zones.zone_id', 'zone.id')
        .innerJoin('trails_zones', 'zone.id', 'trails_zones.zone_id');
    })
    .where('trails_zones.trail_id', req.trail.get('id'));

  const pois = await new QueryBuilder(req, res, query)
    .paginate()
    .eagerLoad([ 'theme' ])
    //.eagerLoad([ 'trails', { points: (qb) => qb.select('*', db.st.asGeoJSON('geom')) } ])
    .fetch();

  res.send(serialize(req, pois, policy));
});
