const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => fixEventsCount(knex));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
};

async function fixEventsCount(knex) {

  const counts = await knex('installation')
    .select('installation.id', 'installation.events_count', knex.raw('count(installation_event.id) AS events_count_verification'))
    .leftOuterJoin('installation_event', 'installation.id', 'installation_event.installation_id')
    .groupBy('installation.id');

  return Promise.all(counts.filter(count => parseInt(count.events_count, 10) !== parseInt(count.events_count_verification, 10)).map(count => {
    return knex('installation').update('events_count', count.events_count_verification).where('id', count.id);
  }));
}
