var _ = require('lodash'),
    utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(knex, createParticipantTable);
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.dropTables(knex, 'participant');
};

function createParticipantTable(knex) {
  return knex.schema.createTable('participant', function(t) {
    t.bigIncrements('id').primary();
    t.string('api_id', 2).notNull();
    t.bigInteger('excursion_id').notNull().references('excursion.id').onUpdate('cascade').onDelete('cascade');
    t.string('name', 30).notNull();
    t.timestamps();
  })
    .raw('create unique index participant_api_id_unique on participant (lower(api_id), excursion_id);');
}
