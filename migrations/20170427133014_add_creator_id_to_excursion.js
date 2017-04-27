var utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(knex, deleteExcursions, addCreatorIdToExcursion);
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return removeCreatorIdFromExcursion(knex);
};

function deleteExcursions(knex) {
  return knex('excursion').delete();
}

function addCreatorIdToExcursion(knex) {
  return knex.schema.alterTable('excursion', function(t) {
    t.bigInteger('creator_id').notNullable().references('user_account.id').onUpdate('cascade').onDelete('cascade');
  });
}

function removeCreatorIdFromExcursion(knex) {
  return knex.schema.alterTable('excursion', function(t) {
    t.dropColumn('creator_id');
  });
}
