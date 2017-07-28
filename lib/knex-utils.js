const _ = require('lodash');
const BPromise = require('bluebird');
const config = require('../config');
const logKnexQueries = require('../server/lib/log-knex-queries');

const logger = config.logger('db');

exports.logMigration = function(knex) {
  logger.info('BEGIN;');
  knex.on('query', logKnexQueries);
};

exports.sequentially = function(knex) {
  const funcs = _.flatten(_.toArray(arguments).slice(1));
  return _.reduce(funcs, function(memo, func) {
    return memo.return(knex).then(func);
  }, BPromise.resolve());
};

exports.dropTables = function(knex) {
  const tableNames = _.flatten(_.toArray(arguments).slice(1));
  return _.reduce(tableNames, function(memo, tableName) {
    return memo.then(_.bind(knex.schema.dropTable, knex.schema, tableName));
  }, BPromise.resolve());
};

exports.dropIndices = function(knex) {
  const indexNames = _.flatten(_.toArray(arguments).slice(1));
  return _.reduce(indexNames, function(memo, indexName) {
    return memo.then(function() {
      return knex.raw('drop index ' + indexName);
    });
  }, BPromise.resolve());
};
