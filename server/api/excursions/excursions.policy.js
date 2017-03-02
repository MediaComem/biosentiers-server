var _ = require('lodash'),
    Excursion = require('../../models/excursion');

exports.canCreate = function(req) {
  return this.authenticated();
};

exports.canList = function(req) {
  return this.authenticated();
};

exports.canRetrieve = function(req) {
  return this.authenticated();
};

exports.scope = function(req) {
  return new Excursion();
};

exports.serialize = function(excursion, req) {
  return {
    id: excursion.get('api_id'),
    trailId: excursion.related('trail').get('api_id'),
    plannedAt: excursion.get('planned_at'),
    createdAt: excursion.get('created_at'),
    updatedAt: excursion.get('updated_at')
  };
};
