const _ = require('lodash');
const authTypes = require('../lib/auth').types;
const BPromise = require('bluebird');
const compose = require('composable-middleware');
const config = require('../../config');
const errors = require('../api/errors');
const Installation = require('../models/installation');
const jwt = require('express-jwt');
const User = require('../models/user');

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
    .use(loadAuthenticatedResource(options)); // Load the user corresponding to the JWT token (if any).
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
  if (_.isPlainObject(resourceName)) {
    options = resourceName;
    resourceName = null;
  }

  options = _.defaults({}, options, {
    authenticate: true,
    required: false,
    active: false,
    resourceId: req => req.params.id,
    resourceName: resourceName,
  });

  let chain = compose();

  // Perform authentication
  if (options.authenticate) {
    chain = chain.use(exports.authenticate(options));
  }

  // Perform authorization
  return chain.use(function(req, res, next) {

    // Save user activity asynchronously (no need to wait before processing the request)
    if (req.currentUser) {
      req.currentUser.saveNewActivity().catch(err => logger.warn('Could not save new user activity', err));
    }

    BPromise.resolve().then(_.partial(policy, req)).then(function(authorized) {
      if (!authorized) {
        throw options.resourceName ? errors.recordNotFound(options.resourceName, options.resourceId(req)) : errors.forbidden();
      }
    }).then(next, next);
  });
};

function loadAuthenticatedResource(options) {
  const required = options.required;
  const active = options.active;

  const allowedAuthTypes = options.authTypes;
  if (!allowedAuthTypes) {
    throw new Error(`Authentication type(s) must be specified; possible types are ${authTypes.join(', ')}`);
  } else if (!_.isArray(allowedAuthTypes)) {
    throw new Error(`Authentication type(s) must be an array; got ${JSON.stringify(allowedAuthTypes)} (${typeof(allowedAuthTypes)})`);
  } else if (!allowedAuthTypes.length) {
    throw new Error(`Authentication type(s) cannot be empty; possible types are ${authTypes.join(', ')}`);
  }

  const unknownAuthTypes = _.difference(allowedAuthTypes, authTypes);
  if (unknownAuthTypes.length) {
    throw new Error(`Unknown authentication type(s) ${unknownAuthTypes.join(', ')}; possible types are ${authTypes.join(', ')}`);
  }

  return function(req, res, next) {
    if (!req.jwtToken) {
      return next(required ? errors.missingAuthorization() : undefined);
    } else if (!_.includes(allowedAuthTypes, req.jwtToken.authType)) {
      return next(errors.invalidAuthorization());
    }

    if (req.jwtToken.authType == 'user') {
      BPromise.resolve([ req, options ]).spread(loadAuthenticatedUser).then(next, next);
    } else if (req.jwtToken.authType == 'installation') {
      BPromise.resolve([ req, options ]).spread(loadAuthenticatedInstallation).then(next, next);
    } else if (req.jwtToken.authType == 'invitation') {
      BPromise.resolve(req).then(ensureInvitationEmailAvailable).then(next, next);
    } else {
      next();
    }
  };
}

// If a user already exists with the same e-mail, then the invitation
// has already been used and is no longer valid.
function ensureInvitationEmailAvailable(req) {
  return new User().whereEmail(req.jwtToken.email).fetch().then(function(user) {
    if (user) {
      throw errors.invalidAuthorization();
    }
  });
}

function loadAuthenticatedUser(req, options) {
  const active = options.active;

  return User.where({
    api_id: req.jwtToken.sub || ''
  }).fetch().then(function(user) {
    if (!user) {
      throw new errors.invalidAuthorization();
    } else if (active && !user.get('active')) {
      throw new errors.invalidAuthorization();
    }

    logger.debug('Authenticated with user ' + user.get('api_id'));
    req.currentUser = user;
  });
}

function loadAuthenticatedInstallation(req, options) {
  return new Installation({
    api_id: req.jwtToken.sub || ''
  }).fetch().then(installation => {
    if (!installation) {
      throw new errors.invalidAuthorization();
    }

    logger.debug(`Authenticated with installation ${installation.get('api_id')}`);
    req.currentInstallation = installation;
  });
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
    return next();
  }

  logger.debug(err);

  if (err.code == 'credentials_required') {
    next(errors.missingAuthorization());
  } else if (err.code == 'credentials_bad_format' || err.code == 'credentials_bad_scheme') {
    next(errors.malformedAuthorization());
  } else {
    next(errors.invalidAuthorization());
  }
}
