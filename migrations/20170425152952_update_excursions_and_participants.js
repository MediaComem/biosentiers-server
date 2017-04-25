var _ = require('lodash'),
    utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    deleteParticipants,
    deleteExcursions,
    addNameToExcursion,
    _.partial(changeExcursionId, _, 5),
    _.partial(changeParticipantName, _, 20)
  );
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    _.partial(changeParticipantName, _, 30),
    _.partial(changeExcursionId, _, 36),
    removeNameFromExcursion
  );
};

function deleteParticipants(knex) {
  return knex('participant').delete();
}

function deleteExcursions(knex) {
  return knex('excursion').delete();
}

function addNameToExcursion(knex) {
  return knex.schema.alterTable('excursion', function(t) {
    t.string('name', 60);
  });
}

function removeNameFromExcursion(knex) {
  return knex.schema.alterTable('excursion', function(t) {
    t.dropColumn('name');
  });
}

function changeExcursionId(knex, length) {
  return knex.schema.alterTable('excursion', function(t) {
    t.string('api_id', length).notNullable().alter();
  });
}

function changeParticipantName(knex, length) {
  return knex.schema.alterTable('participant', function(t) {
    t.string('name', length).notNullable().alter();
  });
}
