const _ = require('lodash');
const parsing = require('../parsing');
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

exports.parse = function(req, participant = new Participant()) {
  return parsing.parseJsonIntoRecord(req.body, participant, 'name');
};

exports.serialize = function(req, participant) {

  const id = participant.get('api_id');
  const excursionId = participant.related('excursion').get('api_id');

  return {
    id: id,
    href: `/api/excursions/${excursionId}/participants/${id}`,
    name: participant.get('name'),
    excursionId: excursionId,
    createdAt: participant.get('created_at'),
    updatedAt: participant.get('updated_at')
  };
};
