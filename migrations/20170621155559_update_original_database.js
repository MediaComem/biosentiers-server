const _ = require('lodash');
const BPromise = require('bluebird');
const utils = require('../lib/knex-utils');

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
    addForeignKeys
  );
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
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
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('class_id').notNullable().alter();
  });
}

function updateBirdHeightTable(knex) {
  return alterTable(knex, 'bird_height', (t) => {
    t.dropPrimary();
    t.renameColumn('id_height', 'id');
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.text('description').notNullable().alter();
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
  }, (t) => {
    t.bigInteger('id').primary().notNullable().alter();
    t.bigInteger('class_id').notNullable().alter();
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
    t.text('name').notNullable().alter();
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
    t.text('name').notNullable().alter();
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
    t.text('name').notNullable().alter();
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

function addForeignKeys(knex) {
  return BPromise.all([
    addForeignKey(knex, 'bird', 'species_id', 'bird_species.id'),
    addForeignKey(knex, 'bird_family', 'class_id', 'class.id'),
    addForeignKey(knex, 'bird_species', 'family_id', 'bird_family.id'),
    addForeignKey(knex, 'bird_species', 'height_id', 'bird_height.id'),
    addForeignKey(knex, 'butterfly', 'species_id', 'butterfly_species.id'),
    addForeignKey(knex, 'butterfly_family', 'class_id', 'class.id'),
    addForeignKey(knex, 'butterfly_species', 'family_id', 'butterfly_family.id'),
    addForeignKey(knex, 'class', 'reign_id', 'reign.id_reign'),
    addForeignKey(knex, 'division', 'reign_id', 'reign.id_reign'),
    addForeignKey(knex, 'flora_family', 'division_id', 'division.id'),
    addForeignKey(knex, 'flower', 'species_id', 'flower_species.id'),
    addForeignKey(knex, 'flower_species', 'family_id', 'flora_family.id')
  ]);
}

function addForeignKey(knex, table, column, reference, nullable) {
  return alterTable(knex, table, (t) => {
    let change = t.bigInteger(column);
    change = nullable ? change.nullable() : change.notNullable();
    change = change.references(reference).onUpdate('cascade').onDelete('cascade').alter();
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
