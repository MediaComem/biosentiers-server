const _ = require('lodash');
const BPromise = require('bluebird');
const db = require('../../db');
const policy = require('./stats.policy');
const route = require('../route');
const serialize = require('../serialize');

exports.retrieve = route(async function(req, res) {

  const tables = await listTables();

  const data = await BPromise.props({
    counts: getAllCounts(tables),
    sizes: getAllSizes(tables)
  });

  const stats = {
    database: {
      size: data.sizes.database
    },
    tables: tables.reduce((memo, table) => {

      memo[table] = _.extend(data.sizes.tables[table], {
        rows: data.counts[table]
      });

      return memo;
    }, {})
  };

  console.log(stats);

  res.send(await serialize(req, stats, policy));
});

async function getAllCounts(tables) {
  return BPromise.props(tables.reduce((memo,table) => {
    memo[table] = db.knex.count().from(table).then(rows => parseInt(rows[0].count, 10));
    return memo;
  }, {}));
}

async function getAllSizes(tables) {

  const knex = db.knex;

  let query = knex.select(knex.raw('pg_database_size(current_database()) AS database_size'));
  tables.forEach(table => {
    query = query.select(
      knex.raw(`pg_relation_size('${table}') AS table_${table}_size`),
      knex.raw(`pg_total_relation_size('${table}') AS table_${table}_total_size`)
    );
  });

  return query.then(rows => rows[0]).then(sizes => {
    return {
      database: parseInt(sizes.database_size, 10),
      tables: tables.reduce((memo, table) => {

        memo[table] = {
          size: parseInt(sizes[`table_${table}_size`], 10),
          totalSize: parseInt(sizes[`table_${table}_total_size`], 10)
        };

        return memo;
      }, {})
    };
  });
}

async function listTables() {
  return db
    .knex
    .select('table_name')
    .from('information_schema.tables')
    .where('table_type', 'BASE TABLE')
    .where('table_schema', 'NOT IN', [ 'pg_catalog', 'information_schema' ])
    .then(rows => rows.map(row => row.table_name));
}
