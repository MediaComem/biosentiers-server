var _ = require('lodash'),
    compose = require('composable-middleware'),
    config = require('../../config'),
    errors = require('../api/errors'),
    jwt = require('express-jwt'),
    p = require('bluebird'),
    User = require('../models/user');

var logger = config.logger('auth');

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
    required: true
  });

  return compose()
    .use(enrichRequest) // Add `req.authenticate`.
    .use(validateJwt()) // Parse the JWT bearer token (if any).
    .use(checkJwtError) // Respond with HTTP 401 Unauthorized if there is a token and it is invalid.
    .use(renameJwt)     // Move JWT token in `req.user` to `req.jwtToken`.
    .use(loadAuthenticatedUser(options.required)); // Load the user corresponding to the JWT token (if any).
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

function enrichRequest(req, res, next) {
  req.authenticated = function() {
    if (req.user) {
      return req.user;
    } else if (!req.get('Authorization')) {
      throw errors.unauthorized('auth.tokenRequired');
    } else if (!req.jwtToken || !req.user) {
      throw errors.unauthorized('auth.tokenInvalid', 'The submitted bearer token is invalid or has expired.');
    } else {
      throw new Error('An unexpected authentication error has occurred.');
    }
  };

  next();
}

function loadAuthenticatedUser(required) {
  return function(req, res, next) {
    if (!req.jwtToken) {
      return next();
    }

    User.where({
      api_id: req.jwtToken.sub
    }).fetch().then(function(user) {
      if (required && (!user || !user.get('active'))) {
        return res.sendStatus(401);
      }

      if (user && user.get('active')) {
        logger.debug('Authenticated with user ' + user.get('api_id'));
        req.user = user;
      }

      next();
    }).catch(next);
  };
};

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
  if (err) {
    // TODO: use standard errors from server/api/errors
    return res.status(401)
      .type('text/plain')
      .send(err.name == 'UnauthorizedError' ? err.message : 'Your authentication credentials are invalid');
  }

  next();
}

/**
 * Helper to simplify authorization policies.
 */
function AuthorizationHelper(req) {
  this.req = req;
}

_.extend(AuthorizationHelper.prototype, {
  authenticated: function() {
    return this.req.authenticated();
  },

  hasRole: function(role) {
    return this.req.user && this.req.user.hasRole(role);
  },

  sameRecord: function(r1, r2) {
    return r1 && r2 && r1.constructor === r2.constructor && r1.get('id') && r1.get('id') === r2.get('id');
  }
});
