var _ = require('lodash'),
    compose = require('composable-middleware'),
    config = require('../../config'),
    errors = require('../api/errors'),
    jwt = require('express-jwt'),
    p = require('bluebird'),
    User = require('../models/user');

var authTypes = [ 'user', 'invitation' ],
    logger = config.logger('auth');

/**
 * Authenticates the user through the Authorization header.
 *
 * @param {Object} options - Authentication options.
 * @param {Boolean} options.required - Whether authentication is required. Defaults to true.
 *                                     If true and the user cannot be authenticated, an HTTP 401 Unauthorized response will be sent and the next middlewares will not run.
 *                                     If false, the user will be loaded if successfully authenticated, and the next middlewares will run.
 *                                     In this latter case, the `authorize` middleware can require authentication later.
 */
exports.authenticate = function(options) {

  options = _.defaults({}, options, {
    required: true,
    active: true,
    authTypes: [ 'user' ]
  });

  return compose()
    .use(validateJwt()) // Parse the JWT bearer token (if any).
    .use(checkJwtError) // Respond with HTTP 401 Unauthorized if there is a token and it is invalid.
    .use(renameJwt)     // Move JWT token in `req.user` to `req.jwtToken`.
    .use(loadAuthenticatedUser(options)); // Load the user corresponding to the JWT token (if any).
};

/**
 * Ensures that the current user (anonymous or authenticated) is authorized to perform the request.
 *
 * @param {Function} policy - A function that takes the request as argument and should return true if the user is authorized, false otherwise.
 *                            When called, `this` will be bound to an `AuthorizationHelper` for the request.
 * @param {String} resourceName - The human-friendly name of the API resource, used in error messages.
 * @param {Object} options - Authorization options.
 * @param {Object} options.required - Whether authentication is required (see `authenticate`). Defaults to false.
 */
exports.authorize = function(policy, resourceName, options) {
  if (_.isObject(resourceName)) {
    options = resourceName;
    resourceName = null;
  }

  options = _.defaults({}, options, {
    required: false,
    active: false,
    resourceName: resourceName
  });

  return compose()
    .use(exports.authenticate(options)) // Perform authentication.
    .use(function(req, res, next) {     // Perform authorization.
      var helper = new AuthorizationHelper(req);
      p.resolve().then(_.bind(policy, helper, req)).then(function(authorized) {
        if (authorized) {
          next();
        } else {
          next(options.resourceName ? errors.recordNotFound(resourceName, req.params.id) : errors.forbidden());
        }
      }).catch(next);
    });
};

function loadAuthenticatedUser(options) {
  return function(req, res, next) {

    var required = options.required,
        active = options.active,
        authTypes = options.authTypes;

    if (!req.jwtToken) {
      return next(required ? missingAuthorizationError() : undefined);
    } else if (!_.includes(authTypes, req.jwtToken.authType)) {
      return next(invalidAuthorizationError());
    }

    if (authTypes && !_.isArray(authTypes)) {
      return next(new Error('Authentication `authTypes` option must be an array'));
    } else if (authTypes && !_.includes(authTypes, req.jwtToken.authType)) {
      return next(invalidAuthorizationError());
    }

    // No need to load the user for other auth types.
    if (req.jwtToken.authType != 'user') {
      return next();
    }

    User.where({
      api_id: req.jwtToken.sub || ''
    }).fetch().then(function(user) {
      if (!user) {
        return next(invalidAuthorizationError());
      } else if (active && !user.get('active')) {
        return next(invalidAuthorizationError());
      }

      logger.debug('Authenticated with user ' + user.get('api_id'));
      req.user = user;
      next();
    }).catch(next);
  };
}

// The express-jwt library stores the JWT token as `req.user`, but we want to put the user object
// in that property, so this function moves the token to `req.jwtToken` for clarity.
function renameJwt(req, res, next) {
  if (_.has(req, 'user')) {
    req.jwtToken = req.user;
    delete req.user;
  }

  next();
}

function validateJwt() {
  return jwt({
    credentialsRequired: false,
    secret: config.jwtSecret
  });
}

function checkJwtError(err, req, res, next) {
  if (!err) {
    next();
  } else if (err.code == 'credentials_required') {
    next(missingAuthorizationError());
  } else if (err.code == 'credentials_bad_format' || err.code == 'credentials_bad_scheme') {
    next(malformedAuthorizationError());
  } else {
    next(invalidAuthorizationError());
  }
}

function ensureRequestAuthenticated(req, options) {
  options = _.defaults({}, options, {
    authTypes: [ 'user' ],
    active: true
  });

  // If no JWT token was provided, no one is authenticated.
  if (!req.jwtToken) {
    throw missingAuthorizationError();
  }

  // If the JWT's auth type is not among the allowed types, authentication is invalid.
  if (!_.includes(options.authTypes, req.jwtToken.authType)) {
    throw invalidAuthorizationError();
  }

  var authType = req.jwtToken.authType;

  // If the auth type is "user" and no user was loaded, authentication is invalid.
  if (authType == 'user' && !req.user) {
    throw invalidAuthorizationError();
  }

  // If the auth type is "user" and the user is inactive, authentication is invalid (unless the `active` option is set to false).
  if (authType == 'user' && options.active && !req.user.get('active')) {
    throw invalidAuthorizationError();
  }

  return req.user || req.jwtToken;
}

function requestHasValidOtp(req, otpType, options) {
  options = _.defaults({}, options, {
    active: true
  });

  return req.jwtToken
    && req.jwtToken.authType == otpType + 'Otp'
    && req.user
    && (!options.active || req.user.get('active'));
}

/**
 * Helper to simplify authorization policies.
 */
function AuthorizationHelper(req) {
  this.req = req;
}

_.extend(AuthorizationHelper.prototype, {
  authenticated: function(options) {
    return ensureRequestAuthenticated(this.req, options);
  },

  validOtp: function(otpType, options) {
    return requestHasValidOtp(this.req, otpType, options);
  },

  hasRole: function(role) {
    return this.req.user && this.req.user.get('active') && this.req.user.hasRole(role);
  },

  sameRecord: function(r1, r2) {
    return r1 && r2 && r1.constructor === r2.constructor && r1.get('id') && r1.get('id') === r2.get('id');
  },

  forbidChange: function(property, currentValue, description) {
    if (_.has(this.req.body, property) && this.req.body[property] !== currentValue) {
      throw errors.forbiddenChange(description);
    } else {
      return true;
    }
  }
});

function missingAuthorizationError() {
  return errors.unauthorized('auth.missingAuthorization');
}

function malformedAuthorizationError() {
  return errors.unauthorized('auth.malformedAuthorization', 'The Authorization header is not in the correct format. It should be "Authorization: Bearer TOKEN".');
}

function invalidAuthorizationError() {
  return errors.unauthorized('auth.invalidAuthorization', 'The Bearer token supplied in the Authorization header is invalid or has expired.');
}
