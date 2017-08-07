const _ = require('lodash');
const db = require('../../db');
const Excursion = require('../../models/excursion');
const params = require('../lib/params');
const policy = require('../policy');
const trailsPolicy = require('../trails/trails.policy');
const usersPolicy = require('../users/users.policy');

exports.canCreate = function(req) {
  return policy.authenticated(req);
};

exports.canList = function(req) {
  return policy.authenticated(req);
};

exports.canRetrieve = function(req) {
  if (policy.hasRole(req, 'admin')) {
    return true;
  } else {
    return policy.authenticated(req) && req.excursion.get('creator_id') === req.currentUser.get('id');
  }
};

exports.canUpdate = function(req) {
  if (policy.hasRole(req, 'admin')) {
    return true;
  } else {
    return policy.authenticated(req) && req.excursion.get('creator_id') === req.currentUser.get('id');
  }
};

exports.scope = function(req) {
  if (policy.hasRole(req, 'admin')) {
    return new Excursion();
  } else {
    return new Excursion().where('creator_id', req.currentUser.get('id'));
  }
};

exports.parse = function(data, excursion = new Excursion()) {
  return excursion.parseFrom(data, 'name', 'plannedAt', 'trailId');
};

exports.serialize = function(req, excursion) {

  const id = excursion.get('api_id');

  const result = {
    id: id,
    href: excursion.get('href'),
    trailHref: excursion.related('trail').get('href'),
    creatorHref: excursion.related('creator').get('href'),
    name: excursion.get('name'),
    participantsHref: `/api/excursions/${id}/participants`,
    participantsCount: excursion.get('participants_count') || 0,
    themes: serializeThemes(excursion),
    zoneHrefs: excursion.related('zones').map(zone => zone.get('href')),
    plannedAt: excursion.get('planned_at'),
    createdAt: excursion.get('created_at'),
    updatedAt: excursion.get('updated_at')
  };

  if (params.includes(req, 'creator')) {
    result.creator = usersPolicy.serialize(req, excursion.related('creator'));
  }

  if (params.includes(req, 'trail')) {
    result.trail = trailsPolicy.serialize(req, excursion.related('trail'));
  }

  return result;
};

function serializeThemes(excursion) {
  return excursion.related('themes').map(theme => theme.get('name')).sort();
}
