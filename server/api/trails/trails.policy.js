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

exports.scope = function(req) {
  return new Trail();
};

exports.parseRequestIntoRecord = function(req, trail) {
  parsing.parseJsonIntoRecord(req.body, trail, [ 'name' ]);
  if (req.body.geometry) {
    trail.set('geom', req.body.geometry);
  }

  return trail;
};

exports.serialize = function(req, trail) {

  const result = {
    id: trail.get('api_id'),
    href: `/api/trails/${trail.get('api_id')}`,
    name: trail.get('name'),
    length: trail.get('path_length'),
    createdAt: trail.get('created_at'),
    updatedAt: trail.get('updated_at')
  };

  if (utils.includes(req, 'geometry')) {
    result.geometry = trail.get('geom');
  }

  return result;
};
