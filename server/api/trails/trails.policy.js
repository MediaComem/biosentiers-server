var _ = require('lodash'),
    Trail = require('../../models/trail');

exports.canCreate = function(req) {
  return this.authenticated() && this.hasRole('admin');
};

exports.canList = function(req) {
  return this.authenticated();
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