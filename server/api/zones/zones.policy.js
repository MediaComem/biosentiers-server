const _ = require('lodash');
const policy = require('../policy');
const Zone = require('../../models/zone');

exports.canList = function(req) {
  return policy.authenticated(req);
};

exports.scope = function(req) {
  // TODO: only the participants of excursions created by the user should be visible to non-admins
  return new Zone();
};

exports.serialize = function(req, zone) {
  return {
    position: zone.get('position'),
    keyword: zone.get('keyword'),
    description: zone.get('description'),
    nature: zone.get('keyword_nature'),
    geometry: zone.get('geom'),
    createdAt: zone.get('created_at')
  };
};
