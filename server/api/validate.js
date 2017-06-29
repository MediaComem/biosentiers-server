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
    return this.validate(this.value(value), this.while(this.noError(this.atCurrentLocation())), ...callbacks);
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
    return this.validate(this.property('body'), this.type('object'), ...callbacks);
  });
};

exports.loadRelatedArray = function(key, data, loader) {
  return function(context) {
    if (!data || !_.isArray(data) || !data.length) {
      return;
    }

    return BPromise.resolve(loader(data)).then(function(related) {
      context.set(`data.${key}`, related);
    });
  };
};

exports.each = function(callback) {
  return function(context) {
    const value = context.get('value');
    if (_.isArray(value) || _.isObject(value)) {
      return BPromise.all(_.map(value, (value, key) => {
        return context.validate(function() {
          return callback.call(this, value, key, this);
        });
      }));
    }
  };
};

exports.preloaded = function(key, loader) {
  return function(id, context) {
    const data = context.get(`data.${key}`);
    if (!data || !data.length) {
      return;
    }

    if (_.isString(loader)) {
      const idKey = loader;
      loader = function(loaderData, loaderId) {
        const criteria = {};
        criteria[idKey] = loaderId;
        return loaderId ? loaderData.findWhere(criteria) : undefined;
      };
    } else if (!loader) {
      loader = function(loaderData, loaderId) {
        return loaderId ? loaderData.findWhere({ id: loaderId }) : undefined;
      };
    } else if (!_.isFunction(loader)) {
      throw new Error('Loader must be a function or a string');
    }

    return loader(data, id);
  };
};
