var _ = require('lodash'),
    utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(knex, createUserAccountRoleEnum, createUserAccountTable);
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.dropIndices(knex, 'user_account_api_id_unique', 'user_account_email_unique').then(function() {
    return utils.dropTables(knex, 'user_account').then(function() {
      return dropUserAccountRoleEnum(knex);
    });
  });
};

function createUserAccountRoleEnum(knex) {
  return knex.raw("create type user_account_role as enum ('user', 'admin');");
}

function createUserAccountTable(knex) {
  return knex.schema.createTable('user_account', function(t) {
    t.bigIncrements('id').primary();
    t.string('api_id', 36).notNull(); // 36 is the length of a UUID.
    t.string('email', 255).notNull();
    t.string('password_hash', 60); // 60 is the length of a bcrypt hash.
    t.boolean('active').notNull().defaultTo(false);
    t.specificType('role', 'user_account_role').notNull().defaultTo('user');
    t.timestamps();
  })
    .raw('create unique index user_account_api_id_unique on user_account (lower(api_id));')
    .raw('create unique index user_account_email_unique on user_account (lower(email));');
};

function dropUserAccountRoleEnum(knex) {
  return knex.raw('drop type user_account_role;');
}
