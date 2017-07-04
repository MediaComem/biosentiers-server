const _ = require('lodash');
const policy = require('../policy');
const Trail = require('../../models/trail');

exports.canCreate = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.canList = function(req) {
  return true;
};

exports.canRetrieve = function(req) {
  return true;
};

exports.scope = function(req) {
  return new Trail();
};

exports.serialize = function(req, trail) {
  return {
    id: trail.get('api_id'),
    name: trail.get('name'),
    createdAt: trail.get('created_at'),
    updatedAt: trail.get('updated_at')
  };
};
