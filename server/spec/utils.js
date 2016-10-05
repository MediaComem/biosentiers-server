var db = require('../db'),
    Promise = require('bluebird');

exports.cleanDatabase = function() {
  return Promise.all([
    db.knex.raw('TRUNCATE user_account')
  ]).return();
};
