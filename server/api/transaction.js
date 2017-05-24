const BPromise = require('bluebird');
const db = require('../db');
const isGenerator = require('is-generator').fn;

module.exports = function(func, ...args) {
  if (!isGenerator(func)) {
    throw new Error('Transaction function must be a generator function (declared with "function*()")');
  }

  return db.transaction(function() {
    return BPromise.coroutine(func)(...args);
  });
};
