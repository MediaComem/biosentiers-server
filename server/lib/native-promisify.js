// FIXME: remove this fix when issue is resolved (https://github.com/petkaantonov/bluebird/issues/1404)
module.exports = function(promise) {
  return new Promise(function(resolve, reject) {
    promise.then(resolve, reject);
  });
};
