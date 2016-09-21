var controller = require('./users.api'),
    express = require('express'),
    utils = require('../utils');

var router = express.Router();

/**
 * @api {post} /users Create a user
 * @apiGroup Users
 * @apiName CreateUser
 * @apiDescription Register a new BioSentiers user with an e-mail and password.
 *
 * @apiUse Authorization
 * @apiUse Validation
 * @apiUse UserResponse
 *
 * @apiParam {String} email A unique e-mail identifying the user.
 */
router.post('/', utils.notYetImplemented);

/**
 * @api {get} /users List users
 * @apiName ListUsers
 * @apiGroup Users
 *
 * @apiUse Pagination
 * @apiUse Authorization
 * @apiUse UserResponse
 */
router.get('/', controller.index);

/**
 * @api {get} /users/:id Retrieve a user
 * @apiName RetrieveUser
 * @apiGroup Users
 *
 * @apiUse Authorization
 * @apiUse UserResponse
 */
router.get('/:id', utils.notYetImplemented);

/**
 * @api {patch} /users/:id Update a user
 * @apiName UpdateUser
 * @apiGroup Users
 *
 * @apiUse Authorization
 * @apiUse UserResponse
 *
 * @apiParam {String{6..}} password The user's password.
 * @apiParam {String} [previousPassword] The user's previous password.
 * @apiParam {String} [otp] Query parameter: the token sent to the user via e-mail on registration.
 */
router.patch('/:id', utils.notYetImplemented);

module.exports = router;

/**
 * @apiDefine UserResponse
 *
 * @apiSuccess {String} id The identifier of the user resource.
 * @apiSuccess {String} email The unique e-mail identifying the user.
 * @apiSuccess {String} createdAt The date at which the user was created (ISO-8601).
 * @apiSuccess {String} updatedAt The date at which the user was last modified (ISO-8601).
 */
