const _ = require('lodash');
const db = require('../../db');
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

exports.parse = function(req, excursion = new Excursion()) {
  parsing.parseJsonIntoRecord(req.body, excursion, 'name', 'plannedAt', 'trailId');
  return excursion;
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
    plannedAt: excursion.get('planned_at'),
    createdAt: excursion.get('created_at'),
    updatedAt: excursion.get('updated_at')
  };

  if (utils.includes(req, 'creator')) {
    result.creator = usersPolicy.serialize(req, excursion.related('creator'));
  }

  if (utils.includes(req, 'trail')) {
    result.trail = trailsPolicy.serialize(req, excursion.related('trail'));
  }

  return serializeZones(excursion).then(zones => {
    result.zones = zones;
    return result;
  });
};

function serializeThemes(excursion) {
  return excursion.related('themes').map(theme => theme.get('name')).sort();
}

// FIXME: find a way to eager load zone positions for excursions
function serializeZones(excursion) {

  const zoneIds = excursion.related('zones').map(zone => zone.get('id'));
  if (!zoneIds.length) {
    return Promise.resolve([]);
  }

  return db.knex('trails_zones').select('position').where('zone_id', 'IN', zoneIds).then(result => {
    return _.map(result, 'position').sort();
  });
}
