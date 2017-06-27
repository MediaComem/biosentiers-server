const BPromise = require('bluebird');
const transaction = require('./transaction');

module.exports = makeRoute;
module.exports.transactional = makeTransactionalRoute;

function makeRoute(routeFunc) {
  return function(req, res, next) {
    BPromise.resolve([ req, res, next ]).spread(routeFunc).catch(next);
  };
}

function makeTransactionalRoute(routeFunc) {
  return makeRoute(function(req, res, next) {
    return transaction(routeFunc, req, res, next);
  });
}
