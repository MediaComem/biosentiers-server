var _ = require('lodash'),
    utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(knex, createTrailTable, createExcursionTable);
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.dropIndices(knex, 'excursion_api_id_unique', 'trail_api_id_unique').then(function() {
    return utils.dropTables(knex, 'excursion', 'trail');
  });
};

function createTrailTable(knex) {
  return knex.schema.createTable('trail', function(t) {
    t.bigIncrements('id').primary();
    t.string('api_id', 36).notNull(); // 36 is the length of a UUID.
    t.string('name', 50).notNull();
    t.timestamps();
  })
    .raw('create unique index trail_api_id_unique on user_account (lower(api_id));');
}

function createExcursionTable(knex) {
  return knex.schema.createTable('excursion', function(t) {
    t.bigIncrements('id').primary();
    t.string('api_id', 36).notNull(); // 36 is the length of a UUID.
    t.bigInteger('trail_id').notNull().references('trail.id').onUpdate('cascade').onDelete('cascade');
    t.timestamp('planned_at').notNull();
    t.timestamps();
  })
    .raw('create unique index excursion_api_id_unique on user_account (lower(api_id));');
}
