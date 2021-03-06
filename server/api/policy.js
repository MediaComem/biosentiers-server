const _ = require('lodash');
const errors = require('./errors');
const validate = require('./validate');
const { ensureExpressRequest } = require('../lib/express');

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

  // If the auth type is "installation" and no installation was loaded, authentication is invalid.
  if (authType == 'installation' && !req.currentInstallation) {
    throw errors.invalidAuthorization();
  }

  return req.currentUser || req.jwtToken;
};

exports.hasRole = function(req, role) {
  ensureExpressRequest(req);
  if (!_.isString(role)) {
    throw new Error('Role is required and must be a string');
  }

  return req.currentUser && req.currentUser.get('active') && req.currentUser.hasRole(role);
};

exports.sameRecord = function(r1, r2) {
  return r1 && r2 && r1.constructor === r2.constructor && r1.get('id') && r1.get('id') === r2.get('id');
};

exports.validateChanges = function(req, callback) {
  return validate.value(req, 403, function() {
    return this.validate(this.property('body'), this.if(context => _.isObject(context.get('value')), callback));
  }).then(() => true);
};

exports.unchanged = function(expectedValue, message) {
  return function(context) {
    if (context.get('valueSet') && context.get('value') !== expectedValue) {
      context.addError({
        validator: 'auth.unchanged',
        message: `You are not authorized to ${message || 'set this property'}. Authenticate with a user account that has more privileges.`
      });
    }
  };
};
