const auth = require('../auth');
const controller = require('./auth.api');
const express = require('express');
const policy = require('./auth.policy');

const router = express.Router();

/**
 * @api {POST} /auth Authenticate
 * @apiGroup Auth
 * @apiName Authenticate
 * @apiDescription Request a new JWT authentication token by providing user credentials (e-mail and password).
 *
 * @apiUse Validation
 *
 * @apiParam (JSON parameters) {String} email The user's e-mail.
 * @apiParam (JSON parameters) {String} password The user's password.
 *
 * @apiExample Example
 * POST /api/v1/auth HTTP/1.1
 * Content-Type: application/json
 *
 * {
 *   "email": "jdoe@example.com",
 *   "password": "letmein"
 * }
 *
 * @apiSuccess (Success 201) {String} token A JWT token which the user can use to authenticate to other API resources.
 * @apiSuccess (Success 201) {Object} user The authenticated user.
 * @apiSuccess (Success 201) {String} user.id The identifier of the user resource.
 * @apiSuccess (Success 201) {String} user.email The unique e-mail identifying the user.
 * @apiSuccess (Success 201) {String} user.active If false, the user cannot log in. A user is inactive when first created, until registration is completed. A user can also be deactivated by an administrator.
 * @apiSuccess (Success 201) {String} user.role The role of the user (`user` or `admin`).
 * @apiSuccess (Success 201) {String} user.createdAt The date at which the user was created (ISO-8601).
 * @apiSuccess (Success 201) {String} user.updatedAt The date at which the user was last modified (ISO-8601).
 *
 * @apiSuccessExample Success 201
 * HTTP/1.1 201 Created
 * Content-Type: application/json
 *
 * {
 *   "token": "eyJhbGciOiJI.eyJzdWIiOiIx.Rq8IxqeX7eA6",
 *   "user": {
 *     "id": "5c49e2f9-2ae6-49be-80ef-0fa4126a7d30",
 *     "email": "jdoe@example.com",
 *     "active": true,
 *     "role": "user",
 *     "createdAt": "2016-01-01T09:32:15Z",
 *     "updatedAt": "2016-01-01T09:34:30Z"
 *   }
 * }
 *
 * @apiError (Error 401) AuthInvalidCredentials The email or password is incorrect.
 *
 * @apiErrorExample {json} Error 401
 * HTTP/1.1 401 Unauthorized
 * Content-Type: application/json
 *
 * {
 *   "errors": [
 *     {
 *       "code": "AuthInvalidCredentials",
 *       "message": "The e-mail or password is incorrect."
 *     }
 *   ]
 * }
 */
router.post('/',
  controller.authenticate);

router.post('/invitations',
  auth.authorize(policy.canInvite),
  controller.createInvitation);

router.get('/invitations',
  auth.authorize(policy.canBeInvited, { authTypes: [ 'invitation' ] }),
  controller.retrieveInvitation);

router.post('/passwordResets',
  auth.authorize(policy.canResetPassword),
  controller.requestPasswordReset);

router.get('/passwordResets',
  auth.authorize(policy.canRetrievePasswordReset, { authTypes: [ 'passwordReset' ] }),
  controller.retrievePasswordResetRequest);

module.exports = router;
