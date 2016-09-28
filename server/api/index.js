var _ = require('lodash'),
    errors = require('./errors'),
    express = require('express');

var router = express.Router();

// Plug in API routes.
router.use('/auth', require('./auth/auth.routes'));
router.use('/flower-pollinators', require('./flower-pollinators/flower-pollinators.routes'));
router.use('/flower-species', require('./flower-species/flower-species.routes'));
router.use('/paths', require('./paths/paths.routes'));
router.use('/pois', require('./pois/pois.routes'));
router.use('/tours', require('./tours/tours.routes'));
router.use('/users', require('./users/users.routes'));

// Catch API 404.
router.all('/*', function(req, res, next) {
  next(errors.notFound());
});

// Return a JSON error response for API calls.
router.use(function(err, req, res, next) {

  var error = _.pick(err, 'code', 'message');

  res.status(err.status || 500).json({
    errors: [ error ]
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
