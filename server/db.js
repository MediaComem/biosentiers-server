var _ = require('lodash'),
    bookshelf = require('bookshelf'),
    config = require('../config'),
    knex = require('knex');

var logger = config.logger('db');

var db = knex({
  client: 'postgresql',
  connection: config.db
});

db.on('query', logDbQueries);

module.exports = bookshelf(db);

module.exports.ensureConnected = function() {
  return db.raw('select 1+1 as n').then(function(result) {
    if (result.rowCount !== 1 || result.rows[0].n !== 2) {
      throw new Error('Could not get expected result from the database');
    }
  });
};

function logDbQueries(query) {

  var message = query.sql;

  if (query.bindings) {
    _.each(query.bindings, function(binding) {
      message = message.replace(/\?/, binding);
    });
  }

  if (!message.match(/;$/)) {
    message = message + ';';
  }

  logger.trace(message);
}
