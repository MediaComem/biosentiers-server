const _ = require('lodash');
const pointsPolicy = require('../zone-points/zone-points.policy.js');
const policy = require('../policy');
const Zone = require('../../models/zone');

exports.canList = function(req) {
  return true;
};

exports.canListByTrail = function(req) {
  return true;
};

exports.canRetrieve = function(req) {
  return true;
};

exports.scope = function(req, baseQuery) {
  return baseQuery || new Zone();
};

exports.serialize = function(req, zone) {
  return {
    id: zone.get('api_id'),
    href: zone.get('href'),
    type: zone.get('type'),
    description: zone.get('description'),
    natureType: zone.get('nature_type'),
    geometry: zone.get('geom'),
    points: zone.related('points').reduce((memo, point) => {
      memo[point.get('type')] = _.omit(pointsPolicy.serialize(req, point), 'type');
      return memo;
    }, {}),
    trailHrefs: zone.related('trails').reduce((memo, trail) => {
      memo[trail.get('href')] = {
        position: trail.pivot.get('position')
      };

      return memo;
    }, {}),
    createdAt: zone.get('created_at')
  };
};
