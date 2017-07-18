const policy = require('../policy');

exports.canInvite = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.canBeInvited = function(req) {
  return policy.authenticated(req, { authTypes: [ 'invitation' ] });
};

exports.canResetPassword = function(req) {
  return true;
};

exports.canRetrievePasswordReset = function(req) {
  return policy.authenticated(req, { authTypes: [ 'passwordReset' ] });
};
