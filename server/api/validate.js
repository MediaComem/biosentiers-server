const _ = require('lodash');
const BPromise = require('bluebird');
const valdsl = require('../lib/valdsl');

exports.value = function(value, status, ...callbacks) {
  if (!callbacks.length) {
    throw new Error('At least one callback is required');
  } else if (_.find(callbacks, (c) => !_.isFunction(c))) {
    throw new Error('Additional arguments must be functions');
  }

  return valdsl(function() {
    return this.validate(this.value(value), this.while(this.hasNoError(this.atCurrentLocation())), ...callbacks);
  }).catch(function(err) {
    if (err.errors && !_.has(err, 'status')) {
      err.status = status || 422;
    }

    return BPromise.reject(err);
  });
};

exports.requestBody = function(req, ...callbacks) {
  if (!req) {
    throw new Error('The first argument must be the request object');
  } else if (!req.app) {
    throw new Error('The first argument does not appear to be an Express request object');
  }

  return exports.value(req, 422, function() {
    return this.validate(this.get('body'), this.type('object'), ...callbacks);
  });
};
