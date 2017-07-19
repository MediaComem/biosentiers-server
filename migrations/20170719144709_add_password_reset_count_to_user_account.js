const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    addPasswordResetCount
  );
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    removePasswordResetCount
  );
};

function addPasswordResetCount(knex) {
  return knex.schema.alterTable('user_account', t => {
    t.integer('password_reset_count').notNullable().defaultTo(0);
  });
}

function removePasswordResetCount(knex) {
  return knex.schema.alterTable('user_account', t => {
    t.dropColumn('password_reset_count');
  });
}
