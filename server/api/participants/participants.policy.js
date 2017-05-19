const _ = require('lodash');
const Participant = require('../../models/participant');
const policy = require('../policy');

exports.canCreate = function(req) {
  // TODO: only an admin or the creator of the excursion should be allowed to create participants
  return policy.authenticated(req);
};

exports.canList = function(req) {
  // TODO: only an admin or the creator of the excursion should be allowed to list its participants
  return policy.authenticated(req);
};

exports.canUpdate = function(req) {
  // TODO: only an admin or the creator of the excursion should be allowed to edit participants
  return policy.authenticated(req);
};

exports.canDelete = function(req) {
  // TODO: only an admin or the creator of the excursion should be allowed to delete participants
  return policy.authenticated(req);
};

exports.scope = function(req) {
  // TODO: only the participants of excursions created by the user should be visible to non-admins
  return new Participant();
};

exports.serialize = function(participant, req) {
  return {
    id: participant.get('api_id'),
    name: participant.get('name'),
    excursionId: participant.related('excursion').get('api_id'),
    createdAt: participant.get('created_at'),
    updatedAt: participant.get('updated_at')
  };
};
