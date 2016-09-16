/**
 * @api {get} /users Retrieve users.
 * @apiName RetrieveUsers
 * @apiGroup Users
 *
 * @apiSuccess {String} name The username.
 */
exports.index = function(req, res) {
  res.json([]);
};
