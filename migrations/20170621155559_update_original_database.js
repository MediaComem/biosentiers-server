const _ = require('lodash');
const BPromise = require('bluebird');
const utils = require('../lib/knex-utils');
const uuid = require('uuid');

/**
 * This migration applies the following changes:
 *
 * - Rename all primary keys to "id"
 * - Change foreign key columns naming convention from "id_thing" to "thing_id"
 * - Change all integer primary and foreign keys to big integers
 * - Add sequences (auto increments) for all primary keys (except bird, butterfly, flower and tree which are child tables of poi)
 * - Make all foreign key columns not null
 * - Make all geometry columns not null
 * - Make some (but not all) other columns not null where appropriate
 * - Make all timestamp columns (e.g. created_at) not null
 * - Change some text columns to varchar(25/50/150)
 * - Remove table name prefix in column names (e.g. "division_name" renamed to "name" in "division" table)
 * - Add appropriate foreign key constraints
 * - Add unique constraints for the primary name of some tables (e.g. class, division, reign)
 *
 * TODO:
 * - make sure GeometryZM is appropriate where used (bird, flower, tree, zone_point, whereas GeometryZ is used for butterfly & path)
 */

let defaultTrailId;

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    createDefaultTrail,
    updateBirdTable,
    updateBirdFamilyTable,
    updateBirdHeightTable,
    updateBirdSpeciesTable,
    updateButterflyTable,
    updateButterflyFamilyTable,
    updateButterflySpeciesTable,
    updateClassTable,
    updateDivisionTable,
    updateFloraFamilyTable,
    updateFlowerTable,
    updateFlowerSpeciesTable,
    updateOwnerTable,
    updatePathTable,
    updatePathTypeTable,
    updatePoiTable,
    updateReignTable,
    updateThemeTable,
    updateTreeTable,
    updateTreeSpeciesTable,
    updateZoneTable,
    updateZonePointTable,
    addForeignKeys,
    addAutoIncrements,
    linkExcursionsToThemes,
    linkExcursionsToZones,
    cleanUp
  );
};

exports.down = function(knex, Promise) {
  throw new Error('This migration is not reversible');
};

function createDefaultTrail(knex) {
  return knex('trail').insert({
    api_id: uuid.v4(),
    name: 'BioSentier Yverdon',
    created_at: new Date(),
    updated_at: new Date()
  }).returning('id').then((result) => {
    defaultTrailId = parseInt(result[0], 10);
  });
}

function updateBirdTable(knex) {
  return alterTable(knex, 'bird', (t) => {
    t.dropPrimary();
    t.renameColumn('id_specie', 'species_id');
    t.renameColumn('id_poi', 'id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('species_id').notNullable().alter();
    t.specificType('geom', 'geometry(GeometryZM,4326)').notNullable().alter();
  });
}

function updateBirdFamilyTable(knex) {
  return alterTable(knex, 'bird_family', (t) => {
    t.dropPrimary();
    t.renameColumn('id_family', 'id');
    t.renameColumn('id_class', 'class_id');
    t.renameColumn('family_name', 'name');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('class_id').notNullable().alter();
    t.string('name', 50).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index bird_family_name_unique on bird_family (lower(name), class_id);');
  });
}

function updateBirdHeightTable(knex) {
  return alterTable(knex, 'bird_height', (t) => {
    t.dropPrimary();
    t.renameColumn('id_height', 'id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.string('description', 150).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index bird_height_description_unique on bird_height (lower(description));');
  });
}

function updateBirdSpeciesTable(knex) {
  return alterTable(knex, 'bird_species', (t) => {
    t.dropPrimary();
    t.renameColumn('id_specie', 'id');
    t.renameColumn('id_family', 'family_id');
    t.renameColumn('id_height', 'height_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('family_id').notNullable().alter();
    t.bigInteger('height_id').notNullable().alter();
  });
}

function updateButterflyTable(knex) {
  return alterTable(knex, 'butterfly', (t) => {
    t.dropPrimary();
    t.renameColumn('id_poi', 'id');
    t.renameColumn('id_specie', 'species_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('species_id').notNullable().alter();
    t.specificType('geom', 'geometry(GeometryZ,4326)').notNullable().alter();
  });
}

function updateButterflyFamilyTable(knex) {
  return alterTable(knex, 'butterfly_family', (t) => {
    t.dropPrimary();
    t.renameColumn('id_family', 'id');
    t.renameColumn('id_class', 'class_id');
    t.renameColumn('family_name', 'name');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('class_id').notNullable().alter();
    t.string('name', 50).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index butterfly_family_name_unique on butterfly_family (lower(name), class_id);');
  });
}

function updateButterflySpeciesTable(knex) {
  return alterTable(knex, 'butterfly_species', (t) => {
    t.dropPrimary();
    t.renameColumn('id_specie', 'id');
    t.renameColumn('id_family', 'family_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('family_id').notNullable().alter();
  });
}

function updateClassTable(knex) {
  return alterTable(knex, 'class', (t) => {
    t.dropPrimary();
    t.renameColumn('id_class', 'id');
    t.renameColumn('id_reign', 'reign_id');
    t.renameColumn('class_name', 'name');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('reign_id').notNullable().alter();
    t.string('name', 50).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index class_name_unique on class (lower(name), reign_id);');
  });
}

function updateDivisionTable(knex) {
  return alterTable(knex, 'division', (t) => {
    t.dropPrimary();
    t.renameColumn('id_division', 'id');
    t.renameColumn('id_reign', 'reign_id');
    t.renameColumn('division_name', 'name');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('reign_id').notNullable().alter();
    t.string('name', 50).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index division_name_unique on division (lower(name), reign_id);');
  });
}

function updateFloraFamilyTable(knex) {
  return alterTable(knex, 'flora_family', (t) => {
    t.dropPrimary();
    t.renameColumn('id_family', 'id');
    t.renameColumn('id_division', 'division_id');
    t.renameColumn('family_name', 'name');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('division_id').notNullable().alter();
    t.string('name', 50).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index flora_family_name_unique on flora_family (lower(name), division_id);');
  });
}

function updateFlowerTable(knex) {
  return alterTable(knex, 'flower', (t) => {
    t.dropPrimary();
    t.renameColumn('id_poi', 'id');
    t.renameColumn('id_specie', 'species_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('species_id').notNullable().alter();
    t.specificType('geom', 'geometry(GeometryZM,4326)').notNullable().alter();
  });
}

function updateFlowerSpeciesTable(knex) {
  return alterTable(knex, 'flower_species', (t) => {
    t.dropPrimary('flower_species_pkey1');
    t.renameColumn('id_specie', 'id');
    t.renameColumn('id_family', 'family_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('family_id').notNullable().alter();
  });
}

function updateOwnerTable(knex) {
  return alterTable(knex, 'owner', (t) => {
    t.dropPrimary();
    t.renameColumn('id_owner', 'id');
    t.renameColumn('owner_name', 'name');
    t.renameColumn('owner_address', 'address');
    t.renameColumn('owner_zipcode', 'zipcode');
    t.renameColumn('owner_city', 'city');
    t.renameColumn('owner_website', 'website');
    t.renameColumn('owner_comment', 'comment');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.string('name', 150).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index owner_name_unique on owner (lower(name));');
  });
}

function updatePathTable(knex) {
  return alterTable(knex, 'path', (t) => {
    t.dropPrimary();
    t.renameColumn('id_path', 'id');
    t.renameColumn('id_type', 'type_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('type_id').notNullable().alter();
    t.specificType('geom', 'geometry(GeometryZ,4326)').notNullable().alter();
    t.string('name', 150).notNullable().alter();
    t.integer('length').notNullable().alter();
    t.timestamp('created_at', true).notNullable().alter();
    // Add a foreign key column linking paths to a trail
    t.bigInteger('trail_id');
  }).then(() => {
    // Link all current paths to the default trail (created at the beginning of the script)
    return knex('path').update('trail_id', defaultTrailId);
  }).then(() => {
    // Make the trail foreign key column not nullable
    return knex.schema.alterTable('path', (t) => {
      t.bigInteger('trail_id').notNullable().alter();
    });
  });
}

function updatePathTypeTable(knex) {
  return alterTable(knex, 'path_type', (t) => {
    t.dropPrimary();
    t.renameColumn('id_type', 'id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.string('name', 25).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index path_type_name_unique on path_type (lower(name));');
  });
}

function updatePoiTable(knex) {
  return alterTable(knex, 'poi', (t) => {
    t.dropPrimary();
    t.renameColumn('id_poi', 'id');
    t.renameColumn('id_owner', 'owner_id');
    t.renameColumn('id_theme', 'theme_id');
    t.renameColumn('id_zone', 'zone_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('owner_id').notNullable().alter();
    t.bigInteger('theme_id').notNullable().alter();
    t.bigInteger('zone_id').notNullable().alter();
    t.timestamp('created_at', true).notNullable().alter();
  });
}

function updateReignTable(knex) {
  return alterTable(knex, 'reign', (t) => {
    t.dropPrimary();
    t.renameColumn('id_reign', 'id');
    t.renameColumn('reign_name', 'name');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.string('name', 50).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index reign_name_unique on reign (lower(name));');
  });
}

function updateThemeTable(knex) {
  return alterTable(knex, 'theme', (t) => {
    t.dropPrimary();
    t.renameColumn('id_theme', 'id');
    t.renameColumn('theme_name', 'name');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.string('name', 25).notNullable().alter();
  }).then(() => {
    return knex.raw('create unique index theme_name_unique on theme (lower(name));');
  });
}

function updateTreeTable(knex) {
  return alterTable(knex, 'tree', (t) => {
    t.dropPrimary();
    t.renameColumn('id_poi', 'id');
    t.renameColumn('id_specie', 'species_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('species_id').notNullable().alter();
    t.specificType('geom', 'geometry(GeometryZM,4326)').notNullable().alter();
  });
}

function updateTreeSpeciesTable(knex) {
  return alterTable(knex, 'tree_species', (t) => {
    t.dropPrimary('tree_species_pkey1');
    t.renameColumn('id_specie', 'id');
    t.renameColumn('id_family', 'family_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('family_id').notNullable().alter();
  });
}

function updateZoneTable(knex) {
  return alterTable(knex, 'zone', (t) => {
    t.dropPrimary();
    t.renameColumn('id_zone', 'id');
    t.renameColumn('keyword_zone', 'keyword');
    t.renameColumn('description_zone', 'description');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.specificType('geom', 'geometry(Geometry,4326)').notNullable().alter();
    t.timestamp('created_at', true).notNullable().alter();
    t.integer('position');
    // Add a foreign key column linking zones to a trail
    t.bigInteger('trail_id');
  }).then(() => {
    // Link all current zones to the default trail (created at the beginning of the script)
    return knex('zone').update('trail_id', defaultTrailId);
  }).then(() => {
    // Make the trail foreign key column not nullable
    return knex.schema.alterTable('zone', (t) => {
      t.bigInteger('trail_id').notNullable().alter();
    });
  }).then(() => {
    return knex('zone').select('id').orderBy('id').then((results) => {
      return BPromise.all(_.map(results, (result, i) => knex('zone').update('position', i + 1).where('id', result.id)));
    });
  }).then(() => {
    return knex.schema.alterTable('zone', (t) => {
      t.integer('position').notNullable().alter();
      t.unique([ 'position', 'trail_id' ]);
    });
  });
}

function updateZonePointTable(knex) {
  return alterTable(knex, 'zone_point', (t) => {
    t.dropPrimary();
    t.renameColumn('id_point', 'id');
    t.renameColumn('id_zone', 'zone_id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('zone_id').notNullable().alter();
    t.specificType('geom', 'geometry(GeometryZM,4326)').notNullable().alter();
    t.string('type', 25).notNullable().alter();
    t.timestamp('created_at', true).notNullable().alter();
  });
}

function addForeignKeys(knex) {
  return BPromise.all([
    addForeignKey(knex, 'bird', 'id', 'poi'),
    addForeignKey(knex, 'bird', 'species_id', 'bird_species'),
    addForeignKey(knex, 'bird_family', 'class_id', 'class'),
    addForeignKey(knex, 'bird_species', 'family_id', 'bird_family'),
    addForeignKey(knex, 'bird_species', 'height_id', 'bird_height'),
    addForeignKey(knex, 'butterfly', 'id', 'poi'),
    addForeignKey(knex, 'butterfly', 'species_id', 'butterfly_species'),
    addForeignKey(knex, 'butterfly_family', 'class_id', 'class'),
    addForeignKey(knex, 'butterfly_species', 'family_id', 'butterfly_family'),
    addForeignKey(knex, 'class', 'reign_id', 'reign'),
    addForeignKey(knex, 'division', 'reign_id', 'reign'),
    addForeignKey(knex, 'flora_family', 'division_id', 'division'),
    addForeignKey(knex, 'flower', 'id', 'poi'),
    addForeignKey(knex, 'flower', 'species_id', 'flower_species'),
    addForeignKey(knex, 'flower_species', 'family_id', 'flora_family'),
    addForeignKey(knex, 'path', 'type_id', 'path_type'),
    addForeignKey(knex, 'path', 'trail_id', 'trail'),
    addForeignKey(knex, 'poi', 'owner_id', 'owner'),
    addForeignKey(knex, 'poi', 'theme_id', 'theme'),
    addForeignKey(knex, 'poi', 'zone_id', 'zone'),
    addForeignKey(knex, 'tree', 'id', 'poi'),
    addForeignKey(knex, 'tree', 'species_id', 'tree_species'),
    addForeignKey(knex, 'tree_species', 'family_id', 'flora_family'),
    addForeignKey(knex, 'zone', 'trail_id', 'trail'),
    addForeignKey(knex, 'zone_point', 'zone_id', 'zone')
  ]);
}

function addAutoIncrements(knex) {
  return BPromise.all(_.map([
    'bird_family', 'bird_height', 'bird_species',
    'butterfly_family', 'butterfly_species',
    'flower_species', 'tree_species', 'flora_family',
    'class', 'division', 'reign',
    'path', 'path_type', 'zone', 'zone_point',
    'poi', 'theme', 'owner'
  ], table => addAutoIncrementFactory(knex, table)));
}

function addAutoIncrementFactory(knex, table) {
  return knex.raw(`SELECT max(id) AS result FROM ${table};`).then((result) => {
    const start = parseInt(result.rows[0].result, 10) + 1;
    return knex.raw(`CREATE SEQUENCE ${table}_id_seq START ${isNaN(start) ? 1 : start};`).then(() => {
      return knex.raw(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT nextval('${table}_id_seq'::regclass);`);
    });
  });
}

function linkExcursionsToThemes(knex) {
  return knex.schema.createTable('excursions_themes', (t) => {

    t.bigInteger('excursion_id')
      .notNullable()
      .references('excursion.id')
      .withKeyName('excursions_themes_excursion_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.bigInteger('theme_id')
      .notNullable()
      .references('theme.id')
      .withKeyName('excursions_themes_theme_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.unique([ 'excursion_id', 'theme_id' ]);
  });
}

function linkExcursionsToZones(knex) {
  return knex.schema.createTable('excursions_zones', (t) => {

    t.bigInteger('excursion_id')
      .notNullable()
      .references('excursion.id')
      .withKeyName('excursions_themes_excursion_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.bigInteger('zone_id')
      .notNullable()
      .references('zone.id')
      .withKeyName('excursions_zones_zone_id_fkey')
      .onUpdate('cascade')
      .onDelete('restrict');

    t.unique([ 'excursion_id', 'zone_id' ]);
  });
}

function cleanUp(knex) {
  return alterTable(knex, 'excursion', (t) => {
    t.dropColumn('themes_and_zones_bitmask');
  });
}

function addForeignKey(knex, table, column, reference_table, nullable) {

  let promise = BPromise.resolve();

  promise = promise.then(() => {
    if (nullable) {
      return knex.raw(`ALTER TABLE ${table} ALTER COLUMN ${column} DROP NOT NULL;`);
    } else {
      return knex.raw(`ALTER TABLE ${table} ALTER COLUMN ${column} SET NOT NULL;`);
    }
  });

  promise = promise.then(() => {
    return knex.raw(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_${column}_fkey FOREIGN KEY (${column}) REFERENCES ${reference_table} (id) ON UPDATE cascade ON DELETE restrict;`)
  });

  return promise;
}

function alterTable(knex, table, ...migrations) {

  let promise = BPromise.resolve();

  _.each(migrations, (migration) => {
    promise = promise.then(function() {
      return knex.schema.alterTable(table, migration);
    });
  });

  return promise;
}
