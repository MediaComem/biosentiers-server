const _ = require('lodash');

const BirdSpecies = require('../../models/bird-species');
const ButterflySpecies = require('../../models/butterfly-species');
const FlowerSpecies = require('../../models/flower-species');
const TreeSpecies = require('../../models/tree-species');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const { cleanUp, getCommonName } = require('../lib/data');
const policy = require('./species.policy');

// API resource name (used in some API errors)
exports.resourceName = 'species';

exports.list = route(async function(req, res) {

  const [ birdSpecies, butterflySpecies, flowerSpecies, treeSpecies ] = await Promise.all([
    listBirdSpecies(),
    listButterflySpecies(),
    listFlowerSpecies(),
    listTreeSpecies()
  ]);

  const species = _.reduce({
    bird: birdSpecies,
    butterfly: butterflySpecies,
    flower: flowerSpecies,
    tree: treeSpecies
  }, (memo, col, theme) => [ ...memo, ...col.models.map(model => buildSpecies(theme, model)) ], []);

  res.send(await serialize(req, species, policy, _.pick(req.query, 'except', 'only')));
});

async function listBirdSpecies() {

  const birdSpecies = await new BirdSpecies().fetchAll();
  await birdSpecies.load([ 'height', 'family.taxonomyClass.reign' ]);

  return birdSpecies;
}

async function listButterflySpecies() {

  const butterflySpecies = await new ButterflySpecies().fetchAll();
  await butterflySpecies.load([ 'family.taxonomyClass.reign' ]);

  return butterflySpecies;
}

async function listFlowerSpecies() {

  const flowerSpecies = await new FlowerSpecies().fetchAll();
  await flowerSpecies.load([ 'family.division.reign' ]);

  return flowerSpecies;
}

async function listTreeSpecies() {

  const treeSpecies = await new TreeSpecies().fetchAll();
  await treeSpecies.load([ 'family.division.reign' ]);

  return treeSpecies;
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
