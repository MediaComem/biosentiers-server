var _ = require('lodash'),
    Participant = require('../../models/participant');

exports.canCreate = function(req) {
  return this.authenticated();
};

exports.scope = function(req) {
  return new Participant();
};

exports.serialize = function(participant, req) {
  return {
    id: participant.get('api_id'),
    name: participant.get('name'),
    excursionId: participant.get('excursion').get('api_id'),
    createdAt: participant.get('created_at'),
    updatedAt: participant.get('updated_at')
  };
};
