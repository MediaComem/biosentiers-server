const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => addColumns(knex))
    .then(() => fillFirstStartedAt(knex))
    .then(() => addFirstStartedAtConstraints(knex));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => removeColumns(knex));
};

function addColumns(knex) {
  return knex.schema.alterTable('installation', t => {
    t.timestamp('created_at', true).notNullable().alter();
    t.timestamp('updated_at', true).notNullable().alter();
    t.timestamp('first_started_at', true);
    t.timestamp('last_event_at', true);
    t.integer('events_count').notNullable().defaultTo(0);
  });
}

function fillFirstStartedAt(knex) {
  return knex.raw('UPDATE installation SET first_started_at = created_at');
}

function addFirstStartedAtConstraints(knex) {
  return knex.schema.alterTable('installation', t => {
    t.timestamp('first_started_at', true).notNullable().alter();
  });
}

function removeColumns(knex) {
  return knex.schema.alterTable('installation', t => {
    t.timestamp('created_at', true).nullable().alter();
    t.timestamp('updated_at', true).nullable().alter();
    t.dropColumn('first_started_at');
    t.dropColumn('last_event_at');
    t.dropColumn('events_count');
  });
}
