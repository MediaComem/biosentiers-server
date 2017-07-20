const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    addConnectionInformationColumns,
    fillFirstActivatedAt
  );
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    removeConnectionInformationColumns
  );
};

function addConnectionInformationColumns(knex) {
  return knex.schema.alterTable('user_account', t => {
    t.timestamp('first_activated_at', true);
    t.timestamp('last_active_at', true);
    t.timestamp('last_login_at', true);
    t.integer('login_count').notNullable().defaultTo(0);
  });
}

function fillFirstActivatedAt(knex) {
  return knex.raw('UPDATE user_account SET first_activated_at = created_at, last_active_at = created_at, last_login_at = created_at, login_count = 1 WHERE active = true;');
}

function removeConnectionInformationColumns(knex) {
  return knex.schema.alterTable('user_account', t => {
    t.dropColumn('first_activated_at');
    t.dropColumn('last_active_at');
    t.dropColumn('last_login_at');
    t.dropColumn('login_count');
  });
}
