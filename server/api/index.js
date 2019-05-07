const _ = require('lodash');
const config = require('../../config');
const errors = require('./errors');
const express = require('express');
const glob = require('glob');
const pkg = require('../../package');

const logger = config.logger('api');
const router = express.Router();

const models = _.without(glob.sync('*', { cwd: `${__dirname}/../models` }), 'abstract.js', 'counters.js');
_.each(models, model => require(`../models/${model}`));

// Plug in API routes
router.use('/auth', require('./auth/auth.routes'));
router.use('/excursions', require('./excursions/excursions.routes'));
router.use('/installations', require('./installations/installations.routes'));
router.use('/installation-events', require('./installation-events/installation-events.routes'));
router.use('/me', require('./users/users.me.routes'));
router.use('/species', require('./species/species.routes'));
router.use('/stats', require('./stats/stats.routes'));
router.use('/themes', require('./themes/themes.routes'));
router.use('/trails', require('./trails/trails.routes'));
router.use('/users', require('./users/users.routes'));
router.use('/zones', require('./zones/zones.routes'));

// API metadata route
router.get('/', function(req, res) {
  res.send({
    version: pkg.version
  });
});

// Catch API 404
router.all('/*', function(req, res, next) {
  next(errors.notFound());
});

// Return a JSON error response for API calls
router.use(function(err, req, res, next) {

  let errors;
  if (err.errors) {
    // If the error contains a list of errors, send it in the response
    errors = err.errors;
  } else {
    // Otherwise, build a one-element array with the error's properties
    errors = [
      _.pick(err, 'code', 'message')
    ];
  }

  const status = err.status || 500;
  if (status >= 500 && status <= 599) {
    logger.error(err);
  }

  res.status(status).json({
    errors: errors
  });
});

module.exports = router;

/**
 * @apiDefine Authorization
 *
 * @apiHeader (Headers) {String} Authorization A bearer token identifying the user.
 * @apiHeaderExample Authorization
 * Authorization: Bearer eyJhbGciOiJI.eyJzdWIiOiIx.Rq8IxqeX7eA6
 *
 * @apiError (Error 401) AuthUnauthorized Authentication is required to access this resource.
 *
 * @apiErrorExample {json} Error 401
 * HTTP/1.1 401 Unauthorized
 * Content-Type: application/json
 *
 * {
 *   "errors": [
 *     {
 *       "code": "AuthUnauthorized",
 *       "message": "Authentication is required to access this resource."
 *     }
 *   ]
 * }
 *
 * @apiError (Error 403) AuthForbidden You are not authorized to access this resource.
 *
 * @apiErrorExample {json} Error 403
 * HTTP/1.1 403 Unauthorized
 * Content-Type: application/json
 *
 * {
 *   "errors": [
 *     {
 *       "code": "AuthForbidden",
 *       "message": "You are not authorized to access this resource."
 *     }
 *   ]
 * }
 */

/**
 * @apiDefine Validation
 *
 * @apiError (Error 422) ValidationError Some request parameters are invalid.
 */

/**
 * @apiDefine Pagination
 *
 * @apiParam (Query parameters) {Number{0..}} offset The index of the first element to list.
 * @apiParam (Query parameters) {Number{1..}} limit The maximum number of elements to list.
 *
 * @apiParamExample offset & limit
 * ?offset=45&limit=15
 */
