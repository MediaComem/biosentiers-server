const _ = require('lodash');
const policy = require('../policy');
const User = require('../../models/user');
const { ensureExpressRequest } = require('../../lib/express');

exports.canCreate = function(req) {
  if (!policy.authenticated(req, { authTypes: [ 'user', 'invitation' ] })) {
    return false;
  } else if (req.jwtToken.authType == 'invitation') {
    return validateChanges(req, {
      active: true,
      email: req.jwtToken.email,
      role: req.jwtToken.role
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
  if (!policy.authenticated(req, { authTypes: [ 'user', 'passwordReset' ] })) {
    return false;
  } else if (policy.hasRole(req, 'admin')) {
    return true;
  } else if (req.jwtToken.authType == 'passwordReset' && req.jwtToken.sub == req.user.get('api_id')) {
    return validateChanges(req);
  } else if (policy.sameRecord(req.currentUser, req.user)) {
    return validateChanges(req);
  }
};

exports.scope = function(req) {

  let scope = new User();

  if (req.query.email && !policy.hasRole(req, 'admin')) {
    scope = scope.whereEmail(req.query.email);
  }

  return scope;
}

exports.parse = function(req, data, user = new User(), ...extras) {
  ensureExpressRequest(req);

  user.parseFrom(data, 'firstName', 'lastName', ...extras);

  if (req.jwtToken.authType == 'invitation' || policy.hasRole(req, 'admin')) {
    user.parseFrom(data, 'active', 'email', 'role');
  }

  return user;
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
      href: user.get('href'),
      active: user.get('active'),
      role: user.get('role'),
      firstName: user.get('first_name'),
      lastName: user.get('last_name'),
      createdAt: user.get('created_at'),
      updatedAt: user.get('updated_at')
    });
  }

  if (admin) {
    serialized.loginCount = user.get('login_count');

    const lastActiveAt = user.get('last_active_at');
    if (lastActiveAt) {
      serialized.lastActiveAt = lastActiveAt;
    }

    const lastLoginAt = user.get('last_login_at');
    if (lastLoginAt) {
      serialized.lastLoginAt = lastLoginAt;
    }
  }

  return serialized;
};

function validateChanges(req, values = {}) {
  if (!req.currentUser && !req.jwtToken) {
    throw new Error('Request must be authenticated');
  }

  return policy.validateChanges(req, function(context) {

    const validations = [
      context.validate(
        context.json('/active'),
        policy.unchanged(_.has(values, 'active') ? values.active : req.user.get('active'), 'set the status of a user')
      ),
      context.validate(
        context.json('/email'),
        policy.unchanged(_.has(values, 'email') ? values.email : req.user.get('email'), 'set the e-mail of a user')
      ),
      context.validate(
        context.json('/role'),
        policy.unchanged(_.has(values, 'role') ? values.role : req.user.get('role'), 'set the role of a user')
      )
    ];

    if (!policy.sameRecord(req.currentUser, req.user) && req.jwtToken.authType != 'invitation') {
      validations.unshift(
        context.validate(
          context.json('/firstName'),
          policy.unchanged(_.has(values, 'firstName') ? values.firstName : req.user.get('first_name'), 'set the first name of a user')
        ),
        context.validate(
          context.json('/lastName'),
          policy.unchanged(_.has(values, 'lastName') ? values.lastName : req.user.get('last_name'), 'set the last name of a user')
        )
      );
    }

    return context.validate(context.parallel(...validations));
  });
}
