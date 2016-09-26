var controller = require('./users.api'),
    express = require('express'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {POST} /users Create a user
 * @apiGroup Users
 * @apiName CreateUser
 * @apiDescription Register a new BioSentiers user with an e-mail and password.
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse UserResponse
 *
 * @apiParam (JSON parameters) {String} email A unique e-mail identifying the user.
 */
router.post('/', utils.notYetImplemented);

/**
 * @api {GET} /users List users
 * @apiName ListUsers
 * @apiGroup Users
 *
 * @apiUse Pagination
 * @apiUse Authorization
 * @apiUse UserResponse
 */
router.get('/', controller.index);

/**
 * @api {GET} /users/:id Retrieve a user
 * @apiName RetrieveUser
 * @apiGroup Users
 *
 * @apiUse Authorization
 * @apiUse UserResponse
 */
router.get('/:id', utils.notYetImplemented);

/**
 * @api {PATCH} /users/:id Update a user
 * @apiName UpdateUser
 * @apiGroup Users
 *
 * @apiUse Authorization
 * @apiUse UserResponse
 *
 * @apiParam (JSON parameters) {String} [registrationOtp] The token sent to the user via e-mail on registration.
 * @apiParam (JSON parameters) {String{6..}} password The user's password.
 * @apiParam (JSON parameters) {String} [previousPassword] The user's previous password.
 */
router.patch('/:id', utils.notYetImplemented);

module.exports = router;

/**
 * @apiDefine UserResponse
 *
 * @apiSuccess (Success 200/201) {String} id The identifier of the user resource.
 * @apiSuccess (Success 200/201) {String} email The unique e-mail identifying the user.
 * @apiSuccess (Success 200/201) {String} createdAt The date at which the user was created (ISO-8601).
 * @apiSuccess (Success 200/201) {String} updatedAt The date at which the user was last modified (ISO-8601).
 */
