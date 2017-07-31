const _ = require('lodash');
const db = require('../../db');
const hrefToApiId = require('../../lib/href').hrefToApiId;
const params = require('../lib/params');
const policy = require('./pois.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const sorting = require('../sorting');
const Theme = require('../../models/theme');

const EAGER_LOAD = [
  'bird',
  'butterfly',
  'flower',
  'theme',
  'tree'
];

// API resource name (used in some API errors)
exports.resourceName = 'poi';

exports.head = route(async function(req, res) {
  const queryBuilder = await createPoiQueryBuilder(req, res);
  await queryBuilder.fetch({ head: true });
  res.sendStatus(200);
});

exports.list = route(async function(req, res) {
  const queryBuilder = await createPoiQueryBuilder(req, res);
  const pois = await queryBuilder.fetch();
  res.send(await serialize(req, pois, policy));
});

async function createPoiQueryBuilder(req, res) {

  const themes = await new Theme().fetchAll();

  const query = policy.scope()
    .query(qb => {
      return qb
        .innerJoin('pois_zones', 'poi.id', 'pois_zones.poi_id')
        .innerJoin('zone', 'pois_zones.zone_id', 'zone.id')
        .innerJoin('trails_zones', 'zone.id', 'trails_zones.zone_id');
    })
    .where('trails_zones.trail_id', req.trail.get('id'));

  return new QueryBuilder(req, res, query)
    .joins('poi', j => {
      j.join('theme', { key: 'poi.theme_id', joinKey: 'theme.id' })
    })
    .filter(filterByThemes)
    .filter(filterByZones)
    .paginate()
    .sorts('createdAt')
    .sort('themeName', sorting.sortByRelated('theme', 'name'))
    .defaultSort('createdAt', 'DESC')
    .eagerLoad(EAGER_LOAD, { themes: themes });
}

function filterByZones(query, req) {

  const hrefs = params.multiValue(req.query.zone, _.isString, hrefToApiId);
  if (!hrefs.length) {
    return;
  }

  return query.query(qb => qb.where('zone.api_id', 'in', hrefs));
}

function filterByThemes(query, req, queryBuilder) {

  const names = params.multiValue(req.query.theme, _.isString);
  if (!names.length) {
    return;
  }

  queryBuilder.requireRelation('theme');
  return query.query(qb => qb.where('theme.name', 'in', names));
}
