const _ = require('lodash');

const BirdSpecies = require('../../models/bird-species');
const ButterflySpecies = require('../../models/butterfly-species');
const FlowerSpecies = require('../../models/flower-species');
const TreeSpecies = require('../../models/tree-species');
const QueryBuilder = require('../query-builder');
const { buildSpecies } = require('../lib/data');
const route = require('../route');
const serialize = require('../serialize');
const policy = require('./species.policy');

// API resource name (used in some API errors)
exports.resourceName = 'species';

exports.list = route(async function(req, res) {

  const [ birdSpecies, butterflySpecies, flowerSpecies, treeSpecies ] = await Promise.all([
    listSpecies(BirdSpecies, [ 'height', 'family.taxonomyClass.reign' ], req.query, 'bird'),
    listSpecies(ButterflySpecies, [ 'family.taxonomyClass.reign' ], req.query, 'butterfly'),
    // TODO: store common_name lang list in constant
    listSpecies(FlowerSpecies, [ 'family.division.reign' ], req.query, 'flower', [ 'fr', 'de', 'it', 'la' ]),
    listSpecies(TreeSpecies, [ 'family.division.reign' ], req.query, 'tree', [ 'fr', 'de', 'it', 'la' ])
  ]);

  const species = _.reduce({
    bird: birdSpecies,
    butterfly: butterflySpecies,
    flower: flowerSpecies,
    tree: treeSpecies
  }, (memo, col, theme) => [ ...memo, ...col.models.map(model => buildSpecies(theme, model)) ], [])
    .sort((a, b) => a.scientificName.localeCompare(b.scientificName));

  res.send(await serialize(req, species, policy, _.pick(req.query, 'except', 'only')));
});

function buildCommonNameSearchConditions(langs) {
  if (!langs.length) {
    return [ 'LOWER(common_name) LIKE ?' ];
  }

  return langs.map(lang => `LOWER(common_name_${lang}) LIKE ?`);
}

function createSpeciesQueryBuilderHandler(query, theme, langs = []) {
  return qb => {

    const conditions = [];
    const values = [];

    const nameSearchConditions = [];
    const nameSearchValues = [];

    if (typeof query.commonNameSearch === 'string') {
      const newConditions = buildCommonNameSearchConditions(langs);
      nameSearchConditions.push(...newConditions);
      nameSearchValues.push(...newConditions.map(() => `%${query.commonNameSearch.toLowerCase()}%`));
    }

    if (typeof query.scientificNameSearch === 'string') {
      nameSearchConditions.push('LOWER(scientific_name) LIKE ?');
      nameSearchValues.push(`%${query.scientificNameSearch.toLowerCase()}%`);
    }

    if (nameSearchConditions.length) {
      conditions.push(`(${nameSearchConditions.join(' OR ')})`);
      values.push(...nameSearchValues);
    }

    if (_.isString(query.theme) || _.isArray(query.theme)) {
      const themes = _.isArray(query.theme) ? query.theme : [ query.theme ];
      if (!_.includes(themes, theme)) {
        conditions.unshift('0 = 1');
      }
    }

    if (conditions.length) {
      qb.whereRaw(conditions.join(' AND '), values);
    }

    return qb;
  };
}

async function listSpecies(model, relations, query, theme, langs = []) {

  const collection = await new model().where(createSpeciesQueryBuilderHandler(query, theme, langs)).fetchAll();
  await collection.load(relations);

  return collection;
}
