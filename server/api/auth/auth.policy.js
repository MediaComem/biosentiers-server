const _ = require('lodash');
const policy = require('../policy');
const usersPolicy = require('../users/users.policy');

exports.canInvite = function(req) {
  if (policy.hasRole(req, 'admin')) {
    return true;
  } else {
    return validateInvitationChanges(req);
  }
};

exports.canRetrieveInvitation = function(req) {
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

  const serialized = _.pick(link, 'email', 'createdAt');
  if (policy.hasRole(req, 'admin')) {
    serialized.link = link.link;
    serialized.user = usersPolicy.serialize(req, link.user);
  }

  return serialized;
};

function validateInvitationChanges(req) {
  return policy.validateChanges(req, function(context) {
    return context.validate(context.parallel(
      validateChange(context, 'role', 'user', 'set the role of an invitation'),
      validateChange(context, 'sent', true, 'set the status of an invitation')
    ));
  });
}

function validateChange(context, property, value, description) {
  return context.validate(
    context.json(`/${property}`),
    policy.unchanged(value, description)
  );
}
