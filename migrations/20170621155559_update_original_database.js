const _ = require('lodash');
const BPromise = require('bluebird');
const utils = require('../lib/knex-utils');

/**
 * - Rename all primary keys to "id"
 * - Change foreign key columns naming convention from "id_thing" to "thing_id"
 * - Change all integer primary and foreign keys to big integers
 * - Make all foreign key columns not null
 * - Make all geometry columns not null
 * - Make some (but not all) other columns not null where appropriate
 * - Make all timestamp columns (e.g. created_at) not null
 * - Change some text columns to varchar(25/50/150)
 * - Remove duplicate table name in column names (e.g. "division_name" renamed to "name" in "division" table)
 * - Add appropriate foreign key constraints
 * - Add unique constraints for the primary name of some tables (e.g. class, division, reign)
 *
 * TODO:
 * - Use "taxonomy_" prefix for tables class, division, reign?
 * - Rename "owner" table (reserved word)
 */

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
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
    updateReignTable,
    updateThemeTable,
    updateTreeTable,
    updateTreeSpeciesTable,
    updateZoneTable,
    updateZonePointTable,
    addForeignKeys
  );
};

exports.down = function(knex, Promise) {
  throw new Error('This migration is not reversible');
};

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
    // TODO: should bird family name be unique or unique by class?
    return knex.raw('create unique index bird_family_name_unique on bird_family (lower(name));');
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
    // TODO: should butterfly family name be unique or unique by class?
    return knex.raw('create unique index butterfly_family_name_unique on butterfly_family (lower(name));');
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
    // TODO: should class name be unique or unique by reign?
    return knex.raw('create unique index class_name_unique on class (lower(name));');
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
    // TODO: should division name be unique or unique by reign?
    return knex.raw('create unique index division_name_unique on division (lower(name));');
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
    // TODO: should flora family name be unique or unique by division?
    return knex.raw('create unique index flora_family_name_unique on flora_family (lower(name));');
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

// TODO: link to trail table + unique constraint
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

// TODO: link to trail table + add order column
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
    addForeignKey(knex, 'bird', 'species_id', 'bird_species.id'),
    addForeignKey(knex, 'bird_family', 'class_id', 'class.id'),
    addForeignKey(knex, 'bird_species', 'family_id', 'bird_family.id'),
    addForeignKey(knex, 'bird_species', 'height_id', 'bird_height.id'),
    addForeignKey(knex, 'butterfly', 'species_id', 'butterfly_species.id'),
    addForeignKey(knex, 'butterfly_family', 'class_id', 'class.id'),
    addForeignKey(knex, 'butterfly_species', 'family_id', 'butterfly_family.id'),
    addForeignKey(knex, 'class', 'reign_id', 'reign.id'),
    addForeignKey(knex, 'division', 'reign_id', 'reign.id'),
    addForeignKey(knex, 'flora_family', 'division_id', 'division.id'),
    addForeignKey(knex, 'flower', 'species_id', 'flower_species.id'),
    addForeignKey(knex, 'flower_species', 'family_id', 'flora_family.id'),
    addForeignKey(knex, 'path', 'type_id', 'path_type.id'),
    addForeignKey(knex, 'tree', 'species_id', 'tree_species.id'),
    addForeignKey(knex, 'tree_species', 'family_id', 'flora_family.id'),
    addForeignKey(knex, 'zone_point', 'zone_id', 'zone.id')
  ]);
}

function addForeignKey(knex, table, column, reference, nullable) {
  return alterTable(knex, table, (t) => {

    let change = t.bigInteger(column);
    change = nullable ? change.nullable() : change.notNullable();

    change = change
      .references(reference)
      .onUpdate('cascade')
      .onDelete('restrict')
      .withKeyName(`${table}_${column}_fkey`)
      .alter();
  });
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
