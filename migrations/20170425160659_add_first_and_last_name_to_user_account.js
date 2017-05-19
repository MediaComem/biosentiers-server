const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(knex, deleteUserAccounts, addFirstAndLastNamesToUserAccount);
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return removeFirstAndLastNamesFromUserAccount(knex);
};

function deleteUserAccounts(knex) {
  return knex.table('user_account').delete();
}

function addFirstAndLastNamesToUserAccount(knex) {
  return knex.schema.alterTable('user_account', function(t) {
    t.string('first_name', 20).notNullable();
    t.string('last_name', 20).notNullable();
  });
}

function removeFirstAndLastNamesFromUserAccount(knex) {
  return knex.schema.alterTable('user_account', function(t) {
    t.dropColumn('first_name');
    t.dropColumn('last_name');
  });
}
