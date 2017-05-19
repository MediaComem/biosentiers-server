const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return addBitmaskToExcursion(knex);
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return removeBitmaskFromExcursion(knex);
};

function addBitmaskToExcursion(knex) {
  return knex.schema.alterTable('excursion', function(t) {
    t.integer('themes_and_zones_bitmask').notNullable().defaultTo(0);
  });
}

function removeBitmaskFromExcursion(knex) {
  return knex.schema.alterTable('excursion', function(t) {
    t.dropColumn('themes_and_zones_bitmask');
  });
}
