const BPromise = require('bluebird');
const db = require('../db');

module.exports = function(func, ...args) {
  return db.transaction(function() {
    return BPromise.resolve(args).spread(func);
  });
};
