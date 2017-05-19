const _ = require('lodash');
const errors = require('./errors');

exports.authenticated = function(req, options) {
  options = _.defaults({}, options, {
    authTypes: [ 'user' ],
    active: true
  });

  // If no JWT token was provided, no one is authenticated.
  if (!req.jwtToken) {
    throw errors.missingAuthorization();
  }

  // If the JWT's auth type is not among the allowed types, authentication is invalid.
  const authType = req.jwtToken.authType;
  if (!_.includes(options.authTypes, authType)) {
    throw errors.invalidAuthorization();
  }

  // If the auth type is "user" and no user was loaded, authentication is invalid.
  if (authType == 'user' && !req.currentUser) {
    throw errors.invalidAuthorization();
  }

  // If the auth type is "user" and the user is inactive, authentication is invalid (unless the `active` option is set to false).
  if (authType == 'user' && options.active && !req.currentUser.get('active')) {
    throw errors.invalidAuthorization();
  }

  return req.currentUser || req.jwtToken;
};

exports.forbidChanges = function(req, changes) {
  _.each(changes, (config, bodyProperty) => exports.forbidChange(req, bodyProperty, config.value, config.message));
  return true;
};

exports.forbidChange = function(req, bodyProperty, currentValue, description) {
  if (_.has(req.body, bodyProperty) && req.body[bodyProperty] !== currentValue) {
    throw errors.forbiddenChange(description);
  } else {
    return true;
  }
};

exports.hasRole = function(req, role) {
  if (!req) {
    throw new Error('The request must be given as the first argument');
  } else if (!req.app) {
    throw new Error('The first argument does not appear to be an Express request object');
  } else if (!_.isString(role)) {
    throw new Error('Role is required and must be a string');
  }

  return req.currentUser && req.currentUser.get('active') && req.currentUser.hasRole(role);
};

exports.sameRecord = function(r1, r2) {
  return r1 && r2 && r1.constructor === r2.constructor && r1.get('id') && r1.get('id') === r2.get('id');
};
