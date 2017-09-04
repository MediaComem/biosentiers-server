const utils = require('../lib/knex-utils');

const INTERVALS = [ 'hour', 'day', 'week', 'month' ];

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => addActivityIndices(knex));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => removeActivityIndices(knex));
};

function addActivityIndices(knex) {
  return Promise.all([
    // Note: no index added on excursion.planned_at as it's not an immutable column
    //       (because it has a timezone)
    addActivityIndex(knex, 'installation', 'first_started_at'),
    addActivityIndex(knex, 'installation_event', 'occurred_at'),
    addActivityIndex(knex, 'user_account', 'created_at')
  ]);
}

function addActivityIndex(knex, table, column) {
  return Promise.all(INTERVALS.map(interval => {
    return knex.schema.raw(`CREATE INDEX ${table}_${column}_${interval}_index ON ${table} (date_trunc('${interval}', ${column}))`);
  }));
}

function removeActivityIndices(knex) {
  return Promise.all([
    removeActivityIndex(knex, 'installation', 'first_started_at'),
    removeActivityIndex(knex, 'installation_event', 'occurred_at'),
    removeActivityIndex(knex, 'user_account', 'created_at')
  ]);
}

function removeActivityIndex(knex, table, column) {
  return Promise.all(INTERVALS.map(interval => {
    return knex.schema.raw(`DROP INDEX ${table}_${column}_${interval}_index`);
  }));
}
