const _ = require('lodash');
const Excursion = require('../../models/excursion');
const parsing = require('../parsing');
const policy = require('../policy');
const trailsPolicy = require('../trails/trails.policy');
const usersPolicy = require('../users/users.policy');
const utils = require('../utils');

exports.canCreate = function(req) {
  return policy.authenticated(req);
};

exports.canList = function(req) {
  return policy.authenticated(req);
};

exports.canRetrieve = function(req) {
  return policy.authenticated(req);
};

exports.canUpdate = function(req) {
  return policy.authenticated(req);
};

exports.scope = function(req) {
  return new Excursion();
};

exports.parseRequestIntoRecord = function(req, excursion) {
  parsing.parseJsonIntoRecord(req.body, excursion, [ 'trailId', 'plannedAt', 'name' ]);
  return excursion;
};

exports.serialize = function(req, excursion) {

  const result = {
    id: excursion.get('api_id'),
    trailId: excursion.related('trail').get('api_id'),
    creatorId: excursion.related('creator').get('api_id'),
    name: excursion.get('name'),
    themes: serializeThemes(excursion),
    zones: serializeZones(excursion),
    plannedAt: excursion.get('planned_at'),
    createdAt: excursion.get('created_at'),
    updatedAt: excursion.get('updated_at')
  };

  if (utils.includes(req, 'creator')) {
    result.creator = usersPolicy.serialize(req, excursion.related('creator'));
  }

  if (utils.includes(req, 'trail')) {
    result.trail = trailsPolicy.serialize(excursion.related('trail'), req);
  }

  return result;
};

function serializeThemes(excursion) {
  return excursion.related('themes').map(theme => theme.get('name'));
}

function serializeZones(excursion) {
  return excursion.related('zones').map(zone => zone.get('position'));
}
