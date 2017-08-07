const _ = require('lodash');
const Participant = require('../../models/participant');
const policy = require('../policy');

exports.canCreate = function(req) {
  // FIXME: only an admin or the creator of the excursion should be allowed to create participants
  return policy.authenticated(req);
};

exports.canList = function(req) {
  // FIXME: only an admin or the creator of the excursion should be allowed to list its participants
  return policy.authenticated(req);
};

exports.canUpdate = function(req) {
  // FIXME: only an admin or the creator of the excursion should be allowed to edit participants
  return policy.authenticated(req);
};

exports.canDelete = function(req) {
  // FIXME: only an admin or the creator of the excursion should be allowed to delete participants
  return policy.authenticated(req);
};

exports.scope = function(req) {
  // FIXME: only the participants of excursions created by the user should be visible to non-admins
  return new Participant();
};

exports.parse = function(data, participant = new Participant()) {
  return participant.parseFrom(data, 'name');
};

exports.serialize = function(req, participant) {
  return {
    id: participant.get('api_id'),
    href: participant.get('href'),
    name: participant.get('name'),
    excursionHref: participant.related('excursion').get('href'),
    createdAt: participant.get('created_at'),
    updatedAt: participant.get('updated_at')
  };
};
