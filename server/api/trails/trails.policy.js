const _ = require('lodash');
const policy = require('../policy');
const Trail = require('../../models/trail');

exports.canCreate = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.canList = function(req) {
  return policy.authenticated(req);
};

exports.scope = function(req) {
  return new Trail();
};

exports.serialize = function(trail, req) {
  return {
    id: trail.get('api_id'),
    name: trail.get('name'),
    createdAt: trail.get('created_at'),
    updatedAt: trail.get('updated_at')
  };
};
