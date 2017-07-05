const _ = require('lodash');
const policy = require('../policy');
const ZonePoint = require('../../models/zone-point');

exports.serialize = function(req, type) {
  return {
    type: type.get('type'),
    geometry: type.get('geom'),
    createdAt: type.get('created_at')
  };
};
