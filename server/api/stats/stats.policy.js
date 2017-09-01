const _ = require('lodash');
const policy = require('../policy');

exports.canRetrieve = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.serialize = function(req, stats, options) {
  return stats;
};
