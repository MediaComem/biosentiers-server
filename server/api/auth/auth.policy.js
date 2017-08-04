const _ = require('lodash');
const policy = require('../policy');
const usersPolicy = require('../users/users.policy');

exports.canInvite = function(req) {
  return true;
};

exports.canBeInvited = function(req) {
  return policy.authenticated(req, { authTypes: [ 'invitation' ] });
};

exports.canResetPassword = function(req) {
  return !req.currentUser || req.currentUser.hasRole('admin');
};

exports.canRetrievePasswordReset = function(req) {
  return policy.authenticated(req, { authTypes: [ 'passwordReset' ] });
};

exports.serializeInvitationLink = function(req, link) {

  const serialized = _.pick(link, 'firstName', 'lastName', 'email', 'role', 'sent', 'createdAt', 'expiresAt');
  if (policy.hasRole(req, 'admin')) {
    serialized.link = link.link;
  }

  return serialized;
};

exports.serializePasswordResetLink = function(req, link) {

  const serialized = {
    email: link.email,
    createdAt: link.createdAt
  };

  if (policy.hasRole(req, 'admin')) {
    serialized.link = link.link;
    serialized.user = usersPolicy.serialize(req, link.user);
  }

  return serialized;
};
