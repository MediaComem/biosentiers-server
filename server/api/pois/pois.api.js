const _ = require('lodash');
const db = require('../../db');
const hrefToApiId = require('../../lib/href').hrefToApiId;
const policy = require('./pois.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const sorting = require('../sorting');
const utils = require('../utils');

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

  const col = await new QueryBuilder(req, res, query)
    .joins('poi', j => {
      j.join('theme', { key: 'poi.theme_id', joinKey: 'theme.id' })
    })
    .filter(filterByThemes)
    .filter(filterByZones)
    .paginate()
    .sorts('createdAt')
    .sort('themeName', sorting.sortByRelated('theme', 'name'))
    .defaultSort('createdAt', 'DESC')
    .eagerLoad([ 'theme' ])
    .fetch({ collection: true });

  const pois = col.models;

  if (pois.length) {
    const themes = _.uniq(_.map(pois, poi => poi.related('theme').get('name')));
    await col.load(_.reduce(themes, (memo, theme) => {
      const themePois = _.filter(pois, poi => poi.related('theme').get('name') === theme);
      memo[theme] = qb => qb.select(`${theme}.*`, db.st.asGeoJSON('geom')).where('id', 'IN', _.map(themePois, poi => poi.get('id')));
      return memo;
    }, {}));
  }

  res.send(await serialize(req, col.models, policy));
});

function filterByZones(query, req) {

  const hrefs = utils.multiValueParam(req.query.zone, _.isString, hrefToApiId);
  if (!hrefs.length) {
    return;
  }

  return query.query(qb => qb.where('zone.api_id', 'in', hrefs));
}

function filterByThemes(query, req, queryBuilder) {

  const names = utils.multiValueParam(req.query.theme, _.isString);
  if (!names.length) {
    return;
  }

  queryBuilder.requireRelation('theme');
  return query.query(qb => qb.where('theme.name', 'in', names));
}
