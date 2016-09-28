var _ = require('lodash'),
    compose = require('composable-middleware'),
    config = require('../../config'),
    errors = require('../api/errors'),
    jwt = require('express-jwt'),
    p = require('bluebird'),
    User = require('../models/user');

var logger = config.logger('auth');

exports.authenticate = function(options) {

  options = _.defaults({}, options, {
    required: true
  });

  return compose()
    .use(enrichRequest)
    .use(validateJwt())
    .use(checkJwtError)
    .use(renameJwt)
    .use(loadAuthenticatedUser(options.required));
};

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
    .use(exports.authenticate(options))
    .use(function(req, res, next) {
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
    if (!req.user) {
      throw errors.unauthorized('auth.missingCredentials');
    } else {
      return req.user;
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
    return res.status(401)
      .type('text/plain')
      .send(err.name == 'UnauthorizedError' ? err.message : 'Your authentication credentials are invalid');
  }

  next();
}

function AuthorizationHelper(req) {
  this.req = req;
}

_.extend(AuthorizationHelper.prototype, {
  authenticated: function() {
    return this.req.authenticated();
  },

  hasRole: function(role) {
    return this.authenticated().hasRole(role);
  },

  sameRecord: function(r1, r2) {
    return r1 && r2 && r1.constructor === r2.constructor && r1.get('id') && r1.get('id') === r2.get('id');
  }
});
