const _ = require('lodash');
const bookshelf = require('bookshelf');
const config = require('../config');
const knex = require('knex');
const postgis = require('knex-postgis');

const logger = config.logger('db');

// Initialize knex.
let db = createDatabase();
let dbDestroyed = false;

// Initialize and export bookshelf.
module.exports = bookshelf(db);
module.exports.plugin('registry');
module.exports.plugin('virtuals');
module.exports.st = postgis(db);

/**
 * Runs a database query to ensure the connection is working.
 *
 * @returns Promise A promise that will be resolved if the connection is working, or rejected otherwise.
 */
module.exports.ensureConnected = function() {
  if (dbDestroyed) {
    db = createDatabase();
    module.exports.knex = db;
    module.exports.st = postgis(db);
    dbDestroyed = false;
  }

  return db.raw('select 1+1 as n').then(function(result) {
    if (result.rowCount !== 1 || result.rows[0].n !== 2) {
      throw new Error('Could not get expected result from the database');
    }
  });
};

module.exports.disconnect = function() {
  return db.destroy().then(function(result) {
    dbDestroyed = true;
    return result;
  });
};

function createDatabase() {
  const newDb = knex({
    client: 'postgresql',
    connection: config.db
  });

  newDb.on('query', logDbQueries);

  return newDb;
}

function logDbQueries(query) {

  let message = query.sql;

  if (query.bindings) {
    _.each(query.bindings, function(binding) {
      // FIXME: only allow in development
      message = message.replace(/\?/, binding);
    });
  }

  if (!message.match(/;$/)) {
    message = message + ';';
  }

  logger.trace(message);
}
