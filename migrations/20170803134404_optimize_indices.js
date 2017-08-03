const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => addIndices(knex));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => removeIndices(knex));
};

function addIndices(knex) {
  return Promise.all([
    addIndex(knex, 'excursion', 'api_id'),
    addIndex(knex, 'excursion', 'created_at'),
    addIndex(knex, 'excursion', 'planned_at'),
    addIndex(knex, 'excursion', 'updated_at'),
    addIndex(knex, 'participant', 'api_id'),
    addIndex(knex, 'poi', 'api_id'),
    addIndex(knex, 'trail', 'api_id'),
    addIndex(knex, 'user_account', 'api_id')
  ]);
}

function addIndex(knex, table, column) {
  return knex.schema.alterTable(table, t => {
    t.index(column);
  });
}

function removeIndices(knex) {
  return Promise.all([
    removeIndex(knex, 'excursion', 'api_id'),
    removeIndex(knex, 'excursion', 'created_at'),
    removeIndex(knex, 'excursion', 'planned_at'),
    removeIndex(knex, 'excursion', 'updated_at'),
    removeIndex(knex, 'participant', 'api_id'),
    removeIndex(knex, 'poi', 'api_id'),
    removeIndex(knex, 'trail', 'api_id'),
    removeIndex(knex, 'user_account', 'api_id')
  ]);
}

function removeIndex(knex, table, column) {
  return knex.schema.alterTable(table, t => {
    t.dropIndex(column);
  });
}
