const _ = require('lodash');
const Poi = require('../../models/poi');
const policy = require('../policy');

exports.canList = function(req) {
  return true;
};

exports.scope = function(req, baseQuery) {
  return baseQuery || new Poi();
};

exports.serialize = function(req, poi) {
  return {
    theme: poi.related('theme').get('name'),
    createdAt: poi.get('created_at')
  };
};
