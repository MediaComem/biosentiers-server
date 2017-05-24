const BPromise = require('bluebird');
const isGenerator = require('is-generator').fn;
const transaction = require('./transaction');

module.exports = makeRoute;
module.exports.transactional = makeTransactionalRoute;

function makeRoute(routeFunc) {
  if (!isGenerator(routeFunc)) {
    throw new Error('Route function must be a generator function (declared with "function*()")');
  }

  return function(req, res, next) {
    BPromise.coroutine(routeFunc)(req, res, next).catch(next);
  };
}

function makeTransactionalRoute(routeFunc) {
  if (!isGenerator(routeFunc)) {
    throw new Error('Route function must be a generator function (declared with "function*()")');
  }

  return makeRoute(function*(req, res, next) {
    return transaction(routeFunc, req, res ,next);
  });
}
