const _ = require('lodash');
const BPromise = require('bluebird');
const config = require('../config');

const logger = config.logger('migrations');

exports.logMigration = function(knex) {

  logger.info('BEGIN;');

  knex.on('query', function(query) {

    let message = query.sql;
    if (query.bindings) {
      _.each(query.bindings, function(binding) {
        // FIXME: only allow in development
        const value = binding ? binding.toString() : binding;
        message = message.replace(/\?/, (value.length > 50 ? `${value.substring(0, 50)}...` : value));
      });
    }

    if (!message.match(/\;$/)) {
      message = message + ';';
    }

    logger.info(message);
  });
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
