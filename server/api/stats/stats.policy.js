const _ = require('lodash');
const moment = require('moment');
const policy = require('../policy');

exports.canRetrieve = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.canRetrieveActivity = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.serialize = function(req, stats, options) {
  return stats;
};

exports.serializeActivity = function(req, activity, options) {
  return {
    interval: activity.interval,
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
    values: activity.values.map(value => {
      return {
        count: value.count,
        countedAt: value.counted_at
      };
    })
  };
};
