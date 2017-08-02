const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => addIndex(knex));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => removeIndex(knex));
};

function addIndex(knex) {
  return knex.schema.alterTable('installation_event', t => {
    t.index('occurred_at');
    t.index([ 'installation_id', 'type', 'occurred_at' ]);
  });
}

function removeIndex(knex) {
  return knex.schema.alterTable('installation_event', t => {
    t.dropIndex('occurred_at');
    t.dropIndex([ 'installation_id', 'type', 'occurred_at' ]);
  });
}
