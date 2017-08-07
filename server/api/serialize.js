const _ = require('lodash');
const BPromise = require('bluebird');
const { ensureExpressRequest } = require('../lib/express');

module.exports = function(req, data, serializer, options) {
  ensureExpressRequest(req);

  if (_.isFunction(serializer.serialize)) {
    serializer = serializer.serialize;
  } else if (!_.isFunction(serializer)) {
    throw new Error('Serializer must be a function or have a "serialize" property that is a function');
  }

  if (!_.isArray(data)) {
    return BPromise.resolve(serializer(req, data, options)).then(result => filterData(req, result, options));
  } else {
    return BPromise.all(_.map(data, item => serializer(req, item, options))).map(result => filterData(req, result, options));
  }
};

function filterData(req, data, options) {

  let except = _.get(options, 'except');
  let only = _.get(options, 'only');
  if (!only && !except) {
    return data;
  }

  if (only) {
    only = _.isArray(only) ? only : [ only ];
    data = _.pick(data, ...only);
  }

  if (except) {
    except = _.isArray(except) ? except : [ except ];
    data = _.omit(data, ...except);
  }

  return data;
}

function queryArray(req, param) {
  const value = req.query[param];
  if (_.isArray(value)) {
    return value;
  } else if (_.isString(value) && value.trim().length) {
    return [ value ];
  } else {
    return [];
  }
}
