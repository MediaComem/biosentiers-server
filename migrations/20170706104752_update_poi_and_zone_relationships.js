const _ = require('lodash');
const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => Promise.all([
      addPoisZonesTable(knex),
      addTrailsZonesTable(knex)
    ]))
    .then(() => Promise.all([
      fillPoisZonesTable(knex),
      fillTrailsZonesTable(knex)
    ]))
    .then(() => Promise.all([
      dropZoneForeignKeyFromPois(knex),
      dropTrailForeignKeyAndPositionFromZonesFromZones(knex)
    ]));
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return Promise
    .resolve()
    .then(() => Promise.all([
      addPoiForeignKeyToZones(knex),
      addTrailForeignKeyToZones(knex)
    ]))
    .then(() => Promise.all([
      fillTrailForeignKeyInZones(knex),
      fillZoneForeignKeyInPois(knex)
    ]))
    .then(() => Promise.all([
      makePoisZoneForeignKeyNotNullable(knex),
      makeZonesTrailForeignKeyNotNullable(knex)
    ]))
    .then(() => dropTables(knex));
};

function dropTrailForeignKeyAndPositionFromZonesFromZones(knex) {
  return knex.schema.alterTable('zone', t => {
    //t.dropUnique([ 'position', 'trail_id' ]);
    t.dropColumn('trail_id');
    t.dropColumn('position');
  });
}

function fillTrailsZonesTable(knex) {
  return knex('zone').select('id', 'position', 'trail_id').then(results => {
    return knex('trails_zones').insert(results.map(result => {
      return { trail_id: result.trail_id, zone_id: result.id, position: result.position };
    }));
  });
}

function addTrailsZonesTable(knex) {
  return knex.schema.createTable('trails_zones', t => {

    t.bigInteger('trail_id')
      .notNullable()
      .references('trail.id')
      .withKeyName('trails_zones_trail_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.bigInteger('zone_id')
      .notNullable()
      .references('zone.id')
      .withKeyName('trails_zones_zone_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.integer('position')
      .notNullable();

    t.unique([ 'trail_id', 'zone_id' ]);
    t.unique([ 'trail_id', 'position' ]);
  });
}

function dropZoneForeignKeyFromPois(knex) {
  return knex.schema.alterTable('poi', t => {
    t.dropColumn('zone_id');
  });
}

function fillPoisZonesTable(knex) {
  return knex('poi').select('id', 'zone_id').then(results => {
    return knex('pois_zones').insert(results.map(result => {
      return { poi_id: result.id, zone_id: result.zone_id };
    }));
  });
}

function addPoisZonesTable(knex) {
  return knex.schema.createTable('pois_zones', t => {

    t.bigInteger('poi_id')
      .notNullable()
      .references('poi.id')
      .withKeyName('pois_zones_poi_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.bigInteger('zone_id')
      .notNullable()
      .references('zone.id')
      .withKeyName('pois_zones_zone_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.unique([ 'poi_id', 'zone_id' ]);
  });
}

function makeZonesTrailForeignKeyNotNullable(knex) {
  return knex.schema.alterTable('zone', t => {
    t.bigInteger('trail_id').notNullable().alter();
    t.integer('position').notNullable().alter();
  });
}

function fillTrailForeignKeyInZones(knex) {
  return knex('trails_zones').select('trail_id', 'zone_id', 'position').then(results => {

    const zonesTrailIds = _.reduce(results, (memo, result) => {
      if (!memo[result.zone_id]) {
        memo[result.zone_id] = [];
      }

      memo[result.zone_id].push({
        trail_id: result.trail_id,
        position: result.position
      });

      return memo;
    }, {});

    return Promise.all(_.map(zonesTrailIds, (trailsData, zoneId) => {
      if (trailsData.length === 0) {
        throw new Error(`Zone ${zoneId} is not linked to any trail`);
      } else if (trailsData.length >= 2) {
        throw new Error(`Zone ${zoneId} is linked to multiple trails: ${_.map(trailsData, 'trail_id').join(', ')}`);
      }

      return knex('zone').where({ id: zoneId }).update({ trail_id: trailsData[0].trail_id, position: trailsData[0].position });
    }));
  });
}

function addTrailForeignKeyToZones(knex) {
  return knex.schema.alterTable('zone', t => {
    t.bigInteger('trail_id')
      .references('trail.id')
      .withKeyName('zone_trail_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.integer('position');
  });
}

function makePoisZoneForeignKeyNotNullable(knex) {
  return knex.schema.alterTable('poi', t => {
    t.bigInteger('zone_id').notNullable().alter();
  });
}

function fillZoneForeignKeyInPois(knex) {
  return knex('pois_zones').select('poi_id', 'zone_id').then(results => {

    const poisZoneIds = _.reduce(results, (memo, result) => {
      if (!memo[result.poi_id]) {
        memo[result.poi_id] = [];
      }

      memo[result.poi_id].push(result.zone_id);
      return memo;
    }, {});

    return Promise.all(_.map(poisZoneIds, (zoneIds, poiId) => {
      if (zoneIds.length === 0) {
        throw new Error(`POI ${poiId} is not linked to any trail`);
      } else if (zoneIds.length >= 2) {
        throw new Error(`POI ${poiId} is linked to multiple trails: ${zoneIds.join(', ')}`);
      }

      return knex('poi').where({ id: poiId }).update({ zone_id: zoneIds[0] });
    }));
  });
}

function addPoiForeignKeyToZones(knex) {
  return knex.schema.alterTable('poi', t => {
    t.bigInteger('zone_id')
      .references('zone.id')
      .withKeyName('poi_zone_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');
  });
}

function dropTables(knex) {
  return Promise.all([
    knex.schema.dropTable('trails_zones'),
    knex.schema.dropTable('pois_zones')
  ]);
}
