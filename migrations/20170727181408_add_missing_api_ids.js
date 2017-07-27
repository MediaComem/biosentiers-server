const _ = require('lodash');
const utils = require('../lib/knex-utils');
const uuid = require('uuid');

const generatedApiIds = [];

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => Promise.all([
      addApiId(knex, 'poi'),
      addApiId(knex, 'bird_species'),
      addApiId(knex, 'butterfly_species'),
      addApiId(knex, 'flower_species'),
      addApiId(knex, 'tree_species')
    ]))
    .then(() => Promise.all([
      fillApiIds(knex, 'poi'),
      fillApiIds(knex, 'bird_species'),
      fillApiIds(knex, 'butterfly_species'),
      fillApiIds(knex, 'flower_species'),
      fillApiIds(knex, 'tree_species')
    ]))
    .then(() => Promise.all([
      addApiIdConstraints(knex, 'poi'),
      addApiIdConstraints(knex, 'bird_species'),
      addApiIdConstraints(knex, 'butterfly_species'),
      addApiIdConstraints(knex, 'flower_species'),
      addApiIdConstraints(knex, 'tree_species')
    ]));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => Promise.all([
      removeApiId(knex, 'poi'),
      removeApiId(knex, 'bird_species'),
      removeApiId(knex, 'butterfly_species'),
      removeApiId(knex, 'flower_species'),
      removeApiId(knex, 'tree_species')
    ]));
};

function addApiId(knex, table) {
  return knex.schema.alterTable(table, t => {
    t.string('api_id', 36);
  });
}

async function fillApiIds(knex, table) {
  return knex(table).select('id').then(rows => {
    return Promise.all(rows.map(row => {
      return knex(table).update('api_id', generateApiId()).where('id', row.id);
    }));
  });
}

function addApiIdConstraints(knex, table) {
  return knex.schema.alterTable(table, t => {
    t.string('api_id', 36).notNullable().alter();
  }).then(() => knex.raw(`create unique index ${table}_api_id_unique on ${table} (lower(api_id));`));
}

function removeApiId(knex, table) {
  return knex.schema.alterTable(table, t => {
    t.dropColumn('api_id');
  });
}

function generateApiId() {

  let apiId;
  do {
    apiId = uuid.v4();
  } while(_.includes(generatedApiIds, apiId));

  return apiId;
}
