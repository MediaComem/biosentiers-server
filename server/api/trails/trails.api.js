const _ = require('lodash');
const policy = require('./trails.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Trail = require('../../models/trail');
const validate = require('../validate');

// API resource name (used in some API errors)
exports.resourceName = 'trail';

exports.create = route.transactional(function*(req, res) {
  yield validateTrail(req);
  const trail = yield Trail.parseJson(req).save();
  res.status(201).send(serialize(req, trail, policy));
});

exports.list = route(function*(req, res) {

  const trails = yield new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sort('createdAt', 'updatedAt')
    .fetch();

  res.send(serialize(req, trails, policy));
});

function validateTrail(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/name'),
        this.presence(),
        this.type('string')
      )
    );
  });
}
