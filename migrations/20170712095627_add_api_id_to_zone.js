const utils = require('../lib/knex-utils');
const uuid = require('uuid');

const generatedApiIds = [];

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    addApiIdColumn,
    generateApiIds,
    addApiIdColumnConstraints,
    renameKeywordColumns
  );
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    renameKeywordColumnsBack,
    dropApiIdColumn
  );
};

function addApiIdColumn(knex) {
  return knex.schema.alterTable('zone', t => {
    t.string('api_id', 36);
  })
    .raw('create unique index zone_api_id_unique on zone (lower(api_id));');
}

function generateApiIds(knex) {
  return knex('zone').select('id').then(results => {
    return Promise.all(results.map(row => {
      return knex('zone')
        .update({ api_id: uuid.v4() })
        .where('id', row.id);
    }));
  });
}

function addApiIdColumnConstraints(knex) {
  return knex.schema.alterTable('zone', t => {
    t.string('api_id', 36).notNullable().alter();
  });
}

function renameKeywordColumns(knex) {
  return knex.schema.alterTable('zone', t => {
    t.renameColumn('keyword', 'type');
    t.renameColumn('keyword_nature', 'nature_type');
  });
}

function dropApiIdColumn(knex) {
  return knex.schema.alterTable('zone', t => {
    t.dropColumn('api_id');
  });
}

function renameKeywordColumnsBack(knex) {
  return knex.schema.alterTable('zone', t => {
    t.renameColumn('type', 'keyword');
    t.renameColumn('nature_type', 'keyword_nature');
  });
}

function generateUniqueApiId() {
  let apiId;
  do {
    apiId = uuid.v4();
  } while (generatedApiIds.indexOf(apiId) >= 0);
  return apiId;
}
