const _ = require('lodash');
const BPromise = require('bluebird');
const Collection = require('../db').Collection;
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

exports.newOrChanged = function(patchMode, predicate) {
  return function(context) {
    if (!patchMode) {
      return true;
    } else if (!context.get('valueSet')) {
      return false;
    } else {
      return predicate(context.get('value'), context);
    }
  };
};

exports.relatedArrayData = function(name, path, dataLoader) {
  if (dataLoader === undefined && _.isFunction(path)) {
    dataLoader = path;
    path = name;
  }

  return function(context) {

    let value = _.get(context.get('value'), path);
    if (_.isArray(value)) {
      value = _.compact(value);
    }

    if (_.isArray(value) && value.length) {

      let loadedData = dataLoader(value, context);
      if (_.isFunction(loadedData.fetchAll)) {
        loadedData = loadedData.fetchAll();
      }

      return BPromise.resolve(loadedData).then(data => {
        return context.setData(name, data);
      });
    } else if (_.isArray(value)) {
      return context.setData(name, []);
    }
  };
};

exports.related = function(name, predicate) {
  return function(value, context) {

    const data = context.getData(name);
    if (!data) {
      return;
    }

    if (_.isString(predicate) && data instanceof Collection) {
      const idProperty = predicate;
      predicate = function(predicateValue, predicateId) {
        const criteria = {};
        criteria[idProperty] = predicateId;
        return predicateId ? predicateValue.findWhere(criteria) : undefined;
      };
    } else if (_.isString(predicate)) {
      const idProperty = predicate;
      predicate = function(predicateValue, predicateId) {
        const criteria = {};
        criteria[idProperty] = predicateId;
        return predicateId ? _.find(predicateValue, criteria) : undefined;
      };
    } else if (!predicate) {
      predicate = function(predicateValue) {
        return predicateValue;
      };
    } else if (!_.isFunction(predicate)) {
      throw new Error('Predicate must be a function or a string');
    }

    return predicate(data, value);
  };
};

exports.remove = function() {
  return function(context) {
    context.get('location').remove(null);
  };
};
