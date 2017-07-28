const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => createInstallationTable(knex))
    .then(() => createInstallationEventTable(knex));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => dropInstallationEventTable(knex))
    .then(() => dropInstallationTable(knex));
};

function createInstallationTable(knex) {
  return knex.schema.createTable('installation', t => {
    t.bigIncrements('id').primary();
    t.string('api_id', 36).notNullable();
    t.binary('shared_secret', 256).notNullable();
    t.json('properties').notNullable();
    t.timestamp('created_at', true);
    t.timestamp('updated_at', true);
    t.index('api_id');
  }).then(() => knex.raw(`create unique index installation_api_id_unique on installation (lower(api_id));`));
}

function createInstallationEventTable(knex) {
  return knex.schema.createTable('installation_event', t => {
    t.bigIncrements('id').primary();
    t.string('api_id', 36).notNullable();
    t.bigInteger('installation_id').notNullable().references('installation.id').onUpdate('cascade').onDelete('cascade');
    t.string('type', 255).notNullable();
    t.json('properties').notNullable();
    t.timestamp('occurred_at', true).notNullable();
    t.timestamp('created_at', true).notNullable();
    t.index('api_id');
  }).then(() => knex.raw(`create unique index installation_event_api_id_unique on installation_event (lower(api_id));`));
}

function dropInstallationTable(knex) {
  return knex.schema.dropTable('installation');
}

function dropInstallationEventTable(knex) {
  return knex.schema.dropTable('installation_event');
}
