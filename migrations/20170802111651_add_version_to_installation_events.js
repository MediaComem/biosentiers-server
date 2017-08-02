const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => addVersionColumn(knex));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => removeVersionColumn(knex));
};

function addVersionColumn(knex) {
  return knex.schema.alterTable('installation_event', t => {
    t.string('version', 25).notNullable();
    t.index('version');
  });
}

function removeVersionColumn(knex) {
  return knex.schema.alterTable('installation_event', t => {
    t.dropColumn('version');
  });
}
