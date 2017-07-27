const _ = require('lodash');
const BPromise = require('bluebird');
const db = require('../../db');
const Poi = require('../../models/poi');
const serialize = require('../serialize');
const Theme = require('../../models/theme');
const trailsPolicy = require('./trails.policy');
const Zone = require('../../models/zone');
const zonesPolicy = require('../zones/zones.policy');

module.exports = async function buildTrailDataPackage(req) {
  const trail = req.trail;

  const themes = await new Theme().fetchAll();

  const zones = await trail.zones()
    .orderBy('trails_zones.position').fetch();

  await zones.load([ 'trails', 'points' ]);

  const pois = await new Poi().query(qb => {
    return qb
      .select('poi.*', 'pois_zones.zone_id')
      .innerJoin('pois_zones', 'poi.id', 'pois_zones.poi_id')
      .where('pois_zones.zone_id', 'IN', zones.map(zone => zone.get('id')))
      .orderBy('poi.theme_id')
      .orderBy('poi.id');
  }).fetchAll();

  await pois.load([
    'bird.species.height',
    'bird.species.family.taxonomyClass.reign',
    'butterfly.species.family.taxonomyClass.reign',
    'flower.species.family.division.reign',
    'owner',
    'theme',
    'tree.species.family.division.reign'
  ], {
    themes: themes
  });

  return {
    pois: pois.models.map(poi => buildPoi(poi, zones)),
    species: buildAllSpecies(pois),
    trail: await serialize(req, trail, trailsPolicy, { include: 'geometry' }),
    zones: await serialize(req, zones.models, zonesPolicy, { except: 'trailHrefs' })
  };
};

function buildPoi(poi, zones) {

  const theme = poi.related('theme').get('name');
  if (!_.includes(Theme.names, theme)) {
    throw new Error(`Unsupported theme ${theme} (must be one of ${Theme.names.join(', ')})`);
  }

  const species = poi.related(theme).related('species');
  if (!species) {
    throw new Error(`Could not find a species for POI ${poi.get('id')} (species ID ${speciesId})`)
  }

  const zoneId = poi.get('zone_id');
  const zone = zones.find(zone => zone.get('id') == zoneId);
  if (!zone) {
    throw new Error(`Could not find a zone for POI ${poi.get('id')} (zone ID ${zoneId})`);
  }

  return {
    id: poi.get('api_id'),
    createdAt: poi.get('created_at'),
    geometry: poi.related(theme).get('geom'),
    ownerName: poi.related('owner').get('name'),
    speciesId: species.get('api_id'),
    theme: theme,
    zoneId: zone.get('api_id')
  };
}

function buildAllSpecies(pois) {

  const species = _.reduce(pois.models, (memo, poi) => {

    const theme = poi.related('theme').get('name');
    memo[theme] = memo[theme] || [];

    const species = poi.related(theme).related('species');
    if (!_.find(memo[theme], existing => existing.get('id') == species.get('id'))) {
      memo[theme].push(species);
    }

    return memo;
  }, {});

  return _.reduce(species, (memo, speciesList, theme) => {
    speciesList.forEach(species => memo.push(buildSpecies(theme, species)));
    return memo;
  }, []);
}

function buildSpecies(theme, species) {

  const result = {
    id: species.get('api_id'),
    characteristics: {
      habitat: species.get('habitat_characteristics')
    },
    periodStart: species.get('period_start'),
    periodEnd: species.get('period_end'),
    scientificName: species.get('scientific_name'),
    taxonomy: {
      family: species.related('family').get('name')
    },
    theme: theme,
    website: species.get('website')
  };

  switch (theme) {
    case 'bird':
      // TODO: check what the "calender" field is
      _.merge(result, {
        behavior: species.get('behavior'),
        characteristics: {
          nesting: species.get('nesting_characteristics'),
          physical: species.get('physical_characteristics'),
          sound: species.get('sound_characteristics')
        },
        comment: species.get('comment'),
        commonName: getCommonName(species),
        food: species.get('food'),
        height: species.related('height').get('description'),
        picture: {
          large: species.get('picture_large'),
          medium: species.get('picture_medium'),
          small: species.get('picture_small')
        },
        size: species.get('size'),
        taxonomy: {
          class: species.related('family').related('taxonomyClass').get('name'),
          reign: species.related('family').related('taxonomyClass').related('reign').get('name')
        },
        weight: species.get('weight'),
        wingspan: species.get('wingspan')
      });
      break;
    case 'butterfly':
      _.merge(result, {
        characteristics: {
          physical: {
            adult: species.get('physical_characteristics_adult'),
            child: species.get('physical_characteristics_child')
          }
        },
        comment: species.get('comment'),
        commonName: getCommonName(species),
        taxonomy: {
          class: species.related('family').related('taxonomyClass').get('name'),
          reign: species.related('family').related('taxonomyClass').related('reign').get('name')
        },
        wingspan: species.get('wingspan')
      });
      break;
    case 'flower':
      // TODO: check what obs_code_fh_2007 & obs_code_fh_2012 are
      _.merge(result, {
        anecdote: species.get('anecdote'),
        characteristics: {
          physical: species.get('physical_characteristics')
        },
        commonName: getCommonName(species, 'fr', 'de', 'it', 'la'),
        height: species.get('height'),
        taxonomy: {
          division: species.related('family').related('division').get('name'),
          reign: species.related('family').related('division').related('reign').get('name')
        }
      });
      break;
    case 'tree':
      // TODO: check what obs_code_fh_2007 & obs_code_fh_2012 are
      _.merge(result, {
        anecdote: species.get('anecdote'),
        characteristics: {
          physical: species.get('physical_characteristics')
        },
        commonName: getCommonName(species, 'fr', 'de', 'it', 'la'),
        height: species.get('height'),
        taxonomy: {
          division: species.related('family').related('division').get('name'),
          reign: species.related('family').related('division').related('reign').get('name')
        }
      });
      break;
    default:
      throw new Error(`Unsupported theme ${theme}`);
  }

  return cleanUp(result);
}

function getCommonName(species, ...langs) {
  if (langs.length) {
    return _.reduce(langs, (memo, lang) => {
      memo[lang] = species.get(`common_name_${lang}`);
      return memo;
    }, {});
  } else {
    return {
      fr: species.get('common_name')
    };
  }
}

function cleanUp(data) {
  if (_.isString(data)) {
    return data.trim();
  } else if (_.isArray(data)) {
    return _.compact(data.map(cleanUp));
  } else if (_.isPlainObject(data)) {
    return _.reduce(data, (memo, value, key) => {
      if (value !== undefined && value !== null) {
        memo[key] = cleanUp(value);
      }

      return memo;
    }, {});
  } else {
    return data;
  }
}
