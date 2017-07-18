const _ = require('lodash');
const compose = require('composable-middleware');
const config = require('../../config');
const errors = require('../api/errors');
const jwt = require('express-jwt');
const p = require('bluebird');
const User = require('../models/user');

// FIXME: extract auth types somewhere else (also used in jwt.js)
const authTypes = [ 'user', 'invitation', 'passwordReset' ];
const logger = config.logger('auth');

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
    .use(loadAuthenticatedUser(options)); // Load the user corresponding to the JWT token (if any).
};

/**
 * Ensures that the current user (anonymous or authenticated) is authorized to perform the request.
 *
 * @param {Function} policy - A function that takes the request as argument and should return true if the user is authorized, false otherwise.
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
    authenticate: true,
    required: false,
    active: false,
    resourceName: resourceName
  });

  let chain = compose();

  // Perform authentication
  if (options.authenticate) {
    chain = chain.use(exports.authenticate(options));
  }

  // Perform authorization
  return chain.use(function(req, res, next) {
    p.resolve().then(_.partial(policy, req)).then(function(authorized) {
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

    const required = options.required;
    const active = options.active;
    const authTypes = options.authTypes;

    if (!req.jwtToken) {
      return next(required ? errors.missingAuthorization() : undefined);
    } else if (!_.includes(authTypes, req.jwtToken.authType)) {
      return next(errors.invalidAuthorization());
    }

    if (authTypes && !_.isArray(authTypes)) {
      return next(new Error('Authentication `authTypes` option must be an array'));
    } else if (authTypes && !_.includes(authTypes, req.jwtToken.authType)) {
      return next(errors.invalidAuthorization());
    }

    // No need to load the user for other auth types.
    if (req.jwtToken.authType != 'user') {
      return next();
    }

    User.where({
      api_id: req.jwtToken.sub || ''
    }).fetch().then(function(user) {
      if (!user) {
        return next(errors.invalidAuthorization());
      } else if (active && !user.get('active')) {
        return next(errors.invalidAuthorization());
      }

      logger.debug('Authenticated with user ' + user.get('api_id'));
      req.currentUser = user;
      next();
    }).catch(next);
  };
}

function validateJwt() {
  return jwt({
    credentialsRequired: false,
    requestProperty: 'jwtToken',
    secret: config.jwtSecret
  });
}

function checkJwtError(err, req, res, next) {
  if (!err) {
    next();
  } else if (err.code == 'credentials_required') {
    next(errors.missingAuthorization());
  } else if (err.code == 'credentials_bad_format' || err.code == 'credentials_bad_scheme') {
    next(errors.malformedAuthorization());
  } else {
    next(errors.invalidAuthorization());
  }
}
