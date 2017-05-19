var controller = require('./users.api'),
    express = require('express'),
    policy = require('./users.policy'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {POST} /users Create a user
 * @apiGroup Users
 * @apiName CreateUser
 * @apiDescription Register a new BioSentiers user identified by an e-mail address.
 *
 * The user will receive an e-mail at the specified address, containing a link.
 * This link will include a Bearer authentication token which can be used to
 * [set the user's password](#api-Users-UpdateUser) and complete the registration.
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse UserResponse
 *
 * @apiParam (JSON parameters) {String} email A unique e-mail identifying the user.
 *
 * @apiExample Example
 * POST /api/users HTTP/1.1
 * Authorization: Bearer eyJhbGciOiJI.eyJzdWIiOiIx.Rq8IxqeX7eA6
 * Content-Type: application/json
 *
 * {
 *   "email": "jdoe@example.com"
 * }
 *
 * @apiSuccessExample Success 201
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 *
 * {
 *   "id": "21bc3db4-8177-4004-b472-613d6239820d",
 *   "email": "jdoe@example.com",
 *   "active": false,
 *   "role": "user",
 *   "createdAt": "2016-01-01T09:30:15Z",
 *   "updatedAt": "2016-01-01T09:30:15Z"
 * }
 */
router.post('/',
  utils.authorize(policy.canCreate, { authTypes: [ 'user', 'invitation' ] }),
  controller.create);

/**
 * @api {GET} /users List users
 * @apiName ListUsers
 * @apiGroup Users
 * @apiDescription Retrieve a paginated list of users.
 *
 * @apiUse Pagination
 * @apiUse Authorization
 * @apiUse UserResponse
 *
 * @apiSuccessExample Success 200
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 * Pagination-Offset: 0
 * Pagination-Limit: 30
 * Pagination-Total: 2
 * Pagination-Filtered: 2
 *
 * [
 *   {
 *     "id": "21bc3db4-8177-4004-b472-613d6239820d",
 *     "email": "jdoe@example.com",
 *     "active": true,
 *     "role": "user",
 *     "createdAt": "2016-01-01T09:30:15Z",
 *     "updatedAt": "2016-01-01T09:30:15Z"
 *   },
 *   {
 *     "id": "a774d438-13ed-4815-88bb-9a90f0558851",
 *     "email": "jsmith@example.com",
 *     "active": true,
 *     "role": "user",
 *     "createdAt": "2016-01-01T09:32:15Z",
 *     "updatedAt": "2016-01-01T09:34:15Z"
 *   }
 * ]
 */
router.get('/',
  utils.authorize(policy.canList),
  controller.list);

/**
 * @api {GET} /users/:id Retrieve a user
 * @apiName RetrieveUser
 * @apiGroup Users
 * @apiDescription Retrieve a specific user.
 *
 * @apiUse Authorization
 * @apiUse UserResponse
 *
 * @apiSuccessExample Success 200
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 *
 * {
 *   "id": "21bc3db4-8177-4004-b472-613d6239820d",
 *   "email": "jdoe@example.com",
 *   "active": true,
 *   "role": "user",
 *   "createdAt": "2016-01-01T09:30:15Z",
 *   "updatedAt": "2016-01-01T09:30:15Z"
 * }
 */
router.get('/:id',
  controller.fetchUser,
  utils.authorize(policy.canRetrieve, controller.name),
  controller.retrieve);

/**
 * @api {PATCH} /users/:id Update a user
 * @apiName UpdateUser
 * @apiGroup Users
 * @apiDescription Update some or all properties of a user.
 *
 * This resource is used for all user updates, including:
 *
 * * Changing the password.
 * * Setting the initial password to complete the registration process.
 *
 * In that last case, the Bearer token supplied in the Authorization header should be
 * the one found in the link sent to the user in the registration e-mail.
 *
 * @apiUse Authorization
 * @apiUse UserResponse
 *
 * @apiParam (JSON parameters) {String{6..}} password The user's password.
 * @apiParam (JSON parameters) {String} [previousPassword] The user's previous password.
 *
 * @apiExample Example
 * PATCH /api/users/21bc3db4-8177-4004-b472-613d6239820d HTTP/1.1
 * Authorization: Bearer eyJhbGciOiJI.eyJzdWIiOiIx.Rq8IxqeX7eA6
 * Content-Type: application/json
 *
 * {
 *   "password": "letmein",
 *   "previousPassword": "changeme"
 * }
 *
 * @apiSuccessExample Success 201
 * HTTP/1.1 200 OK
 * Content-Type: application/json
 *
 * {
 *   "id": "21bc3db4-8177-4004-b472-613d6239820d",
 *   "email": "jdoe@example.com",
 *   "active": true,
 *   "role": "user",
 *   "createdAt": "2016-01-01T09:30:15Z",
 *   "updatedAt": "2016-01-01T09:30:15Z"
 * }
 */
router.patch('/:id',
  controller.fetchUser,
  utils.authorize(policy.canUpdate, controller.name),
  controller.update);

module.exports = router;

/**
 * @apiDefine UserResponse
 *
 * @apiSuccess (Success 200/201) {String} id The identifier of the user resource.
 * @apiSuccess (Success 200/201) {String} email The unique e-mail identifying the user.
 * @apiSuccess (Success 200/201) {String} active If false, the user cannot log in. A user is inactive when first created, until registration is completed. A user can also be deactivated by an administrator.
 * @apiSuccess (Success 200/201) {String} role The role of the user (`user` or `admin`).
 * @apiSuccess (Success 200/201) {String} createdAt The date at which the user was created (ISO-8601).
 * @apiSuccess (Success 200/201) {String} updatedAt The date at which the user was last modified (ISO-8601).
 */
