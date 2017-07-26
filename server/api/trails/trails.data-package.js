const _ = require('lodash');
const db = require('../../db');
const Poi = require('../../models/poi');
const poisPolicy = require('../pois/pois.policy');
const serialize = require('../serialize');
const trailsPolicy = require('./trails.policy');
const Zone = require('../../models/zone');
const zonesPolicy = require('../zones/zones.policy');

module.exports = async function buildTrailDataPackage(req) {
  const trail = req.trail;

  const zones = await trail.zones()
    .query(qb => qb.select('zone.*', db.st.asGeoJSON('geom')))
    .orderBy('trails_zones.position').fetch();

  await zones.load({
    points: qb => qb.select('zone_point.*', db.st.asGeoJSON('geom'))
  });

  const pois = await new Poi().query(qb => {
    return qb
      .innerJoin('pois_zones', 'poi.id', 'pois_zones.poi_id')
      .where('pois_zones.zone_id', 'IN', zones.map(zone => zone.get('id')));
  }).fetchAll();

  await pois.load([ 'theme' ]);

  if (pois.models.length) {
    const themes = _.uniq(pois.map(poi => poi.related('theme').get('name')));
    await pois.load(_.reduce(themes, (memo, theme) => {
      const themePois = pois.filter(poi => poi.related('theme').get('name') === theme);
      memo[theme] = qb => qb.select(`${theme}.*`, db.st.asGeoJSON('geom')).where('id', 'IN', _.map(themePois, poi => poi.get('id')));
      return memo;
    }, {}));
  }

  return {
    pois: pois.models.map(poi => buildPoiFeature(poi)),
    trail: await serialize(req, trail, trailsPolicy, { include: 'geometry' }),
    zones: await serialize(req, zones.models, zonesPolicy)
  };
};

function buildPoiFeature(poi) {

  const theme = poi.related('theme').get('name');
  const properties = {
  };

  const feature = {
    type: 'Feature',
    geometry: poi.related(theme).get('geom'),
    properties: properties
  };

  switch (theme) {
    case 'bird':
      _.extend(properties, {
      });
      break;
    case 'butterfly':
      _.extend(properties, {
      });
      break;
    case 'flower':
      _.extend(properties, {
      });
      break;
    case 'tree':
      _.extend(properties, {
      });
      break;
    default:
      throw new Error(`Unsupporte POI type ${theme}`);
  }

  return feature;
}
