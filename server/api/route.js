const BPromise = require('bluebird');
const isGenerator = require('is-generator').fn;
const RouteHelper = require('./route-helper');

module.exports = function(routeFunc) {
  if (!isGenerator(routeFunc)) {
    throw new Error('Route function must be a generator function (declared with "function*()")');
  }

  return function(req, res, next) {
    const helper = new RouteHelper(req, res);
    BPromise.coroutine(routeFunc)(req, res, next, helper).catch(next);
  };
};
