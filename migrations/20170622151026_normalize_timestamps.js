const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    normalizeTimestampsFactory('excursion'),
    normalizeTimestampsFactory('participant'),
    normalizeTimestampsFactory('trail'),
    normalizeTimestampsFactory('user_account')
  );
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    denormalizeTimestampsFactory('user_account'),
    denormalizeTimestampsFactory('trail'),
    denormalizeTimestampsFactory('participant'),
    denormalizeTimestampsFactory('excursion')
  );
};

function normalizeTimestampsFactory(table) {
  return function(knex) {
    return knex.schema.alterTable(table, (t) => {
      t.timestamp('created_at', true).notNullable().alter();
      t.timestamp('updated_at', true).notNullable().alter();
    });
  };
}

function denormalizeTimestampsFactory(table) {
  return function(knex) {
    return knex.schema.alterTable(table, (t) => {
      t.timestamp('created_at').nullable().alter();
      t.timestamp('updated_at').nullable().alter();
    });
  };
}
