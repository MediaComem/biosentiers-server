const _ = require('lodash');
const Path = require('../../models/path');
const policy = require('../policy');

exports.canList = function(req) {
  return true;
};

exports.scope = function(req) {
  // TODO: only the participants of excursions created by the user should be visible to non-admins
  return new Path();
};

exports.serialize = function(req, path) {
  return {
    name: path.get('name'),
    type: path.related('type').get('name'),
    length: path.get('length'),
    geometry: path.get('geom'),
    createdAt: path.get('created_at')
  };
};
