const _ = require('lodash');
const parsing = require('../parsing');
const policy = require('../policy');
const Trail = require('../../models/trail');
const utils = require('../utils');

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

exports.parse = function(req, trail = new Trail()) {
  parsing.parseJsonIntoRecord(req.body, trail, 'name', {
    geom: 'geometry'
  });

  return trail;
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

  if (utils.includes(req, 'geometry', options)) {
    result.geometry = trail.get('geom');
  }

  return result;
};
