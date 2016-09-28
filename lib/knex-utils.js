var _ = require('lodash'),
    config = require('../config'),
    Promise = require('bluebird');

var logger = config.logger('migrations');

exports.logMigration = function(knex) {

  logger.info('BEGIN;');

  knex.on('query', function(query) {

    var message = query.sql;
    if (!message.match(/\;$/)) {
      message = message + ';';
    }

    logger.info(message);
  });
};

exports.sequentially = function(knex) {
  var funcs = _.flatten(Array.prototype.slice.call(arguments, 1));
  return _.reduce(funcs, function(memo, func) {
    return memo.return(knex).then(func);
  }, Promise.resolve());
};

exports.dropTables = function(knex) {
  var tableNames = _.flatten(Array.prototype.slice.call(arguments, 1));
  return _.reduce(tableNames, function(memo, tableName) {
    return memo.then(_.bind(knex.schema.dropTable, knex.schema, tableName));
  }, Promise.resolve());
};

exports.dropIndices = function(knex) {
  var indexNames = _.flatten(Array.prototype.slice.call(arguments, 1));
  return _.reduce(indexNames, function(memo, indexName) {
    return memo.then(function() {
      return knex.raw('drop index ' + indexName);
    });
  }, Promise.resolve());
};
