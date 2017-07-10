const _ = require('lodash');
const parsing = require('../parsing');
const policy = require('../policy');
const User = require('../../models/user');

exports.canCreate = function(req) {
  policy.authenticated(req, { authTypes: [ 'user', 'invitation' ] });

  if (req.jwtToken.authType == 'invitation') {
    return policy.forbidChanges(req, {
      active: { value: true, message: 'set the status of an invited user' },
      email: { value: req.jwtToken.email, message: 'set the e-mail of an invited user' },
      role: { value: req.jwtToken.role, message: 'set the role of an invited user' }
    });
  } else {
    return policy.hasRole(req, 'admin');
  }
};

exports.canList = function(req) {
  return req.query.email || (policy.authenticated(req) && policy.hasRole(req, 'admin'));
};

exports.canRetrieve = function(req) {
  return policy.authenticated(req) && (policy.hasRole(req, 'admin') || policy.sameRecord(req.currentUser, req.user));
};

exports.canUpdate = function(req) {
  if (policy.hasRole(req, 'admin')) {
    return true;
  } else if (policy.authenticated(req) && policy.sameRecord(req.currentUser, req.user)) {
    return policy.forbidChanges(req, {
      active: { value: req.currentUser.get('active'), message: 'change the status of a user' },
      email: { value: req.currentUser.get('email'), message: 'change the e-mail of a user' },
      role: { value: req.currentUser.get('role'), message: 'change the role of a user' }
    });
  }
};

exports.scope = function(req) {

  let scope = new User();

  if (req.query.email && !policy.hasRole(req, 'admin')) {
    scope = scope.whereEmail(req.query.email);
  }

  return scope;
}

exports.parse = function(req, user = new User(), ...extras) {
  return parsing.parseJsonIntoRecord(req.body, user, 'active', 'email', 'role', 'firstName', 'lastName', ...extras);
};

exports.serialize = function(req, user) {

  const serialized = {
    email: user.get('email')
  };

  const admin = req.currentUser && req.currentUser.hasRole('admin');
  const sameUser = req.currentUser && req.currentUser.get('api_id') == user.get('api_id');
  const invitedUser = req.jwtToken && req.jwtToken.authType == 'invitation' && req.jwtToken.email.toLowerCase() == user.get('email').toLowerCase();

  if (admin || sameUser || invitedUser) {
    _.extend(serialized, {
      id: user.get('api_id'),
      href: `/api/users/${user.get('api_id')}`,
      active: user.get('active'),
      role: user.get('role'),
      firstName: user.get('first_name'),
      lastName: user.get('last_name'),
      createdAt: user.get('created_at'),
      updatedAt: user.get('updated_at')
    });
  }

  return serialized;
};
