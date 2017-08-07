const _ = require('lodash');
const params = require('../lib/params');
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

exports.canRetrieveDataPackage = function(req) {
  return true;
};

exports.scope = function(req) {
  return new Trail();
};

exports.parse = function(data, trail = new Trail()) {
  return trail.parseFrom(data, 'name', {
    geom: 'geometry'
  });
};

exports.serialize = function(req, trail, options) {

  const result = {
    id: trail.get('api_id'),
    href: trail.get('href'),
    name: trail.get('name'),
    length: trail.get('path_length'),
    createdAt: trail.get('created_at'),
    updatedAt: trail.get('updated_at')
  };

  if (params.includes(req, 'geometry', options)) {
    result.geometry = trail.get('geom');
  }

  return result;
};
