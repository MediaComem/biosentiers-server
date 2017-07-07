const _ = require('lodash');
const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    addTrailPathColumn,
    setTrailPathFromLegacyTable,
    makeTrailPathNotNullable,
    dropLegacyPathTables
  );
};

exports.down = function(knex, Promise) {
  throw new Error('This migration is not reversible');
};

function addTrailPathColumn(knex) {
  return knex.schema.alterTable('trail', t => {
    t.specificType('geom', 'geometry(GeometryZ,4326)');
    t.integer('length');
  });
}

function setTrailPathFromLegacyTable(knex) {
  return knex('trail').select('id').then(trailsResult => {
    return Promise.all(_.map(trailsResult, trailResult => {
      const trailId = trailResult.id;
      return knex('path').select('geom', 'length').where({ trail_id: trailId }).orderBy('length', 'desc').limit(1).then(pathResult => {

        const path = pathResult[0];
        if (!path) {
          return;
        }

        return knex('trail').update({ geom: path.geom, length: path.length }).where({ id: trailId });
      });
    }));
  });
}

function makeTrailPathNotNullable(knex) {
  return knex.schema.alterTable('trail', t => {
    t.specificType('geom', 'geometry(GeometryZ,4326)').notNullable().alter();
    t.integer('length').notNullable().alter();
  });
}

function dropLegacyPathTables(knex) {
  return knex.schema.dropTable('path').then(() => knex.schema.dropTable('path_type')).then(() => Promise.all([
    knex.raw('DROP SEQUENCE path_id_seq;'),
    knex.raw('DROP SEQUENCE path_type_id_seq;')
  ]));
}
