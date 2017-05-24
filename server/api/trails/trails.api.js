const _ = require('lodash');
const api = require('../utils');
const policy = require('./trails.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Trail = require('../../models/trail');
const transaction = require('../transaction');
const validate = require('../validate');

const builder = api.builder(Trail, 'trails');

// API resource name (used in some API errors)
exports.resourceName = 'trail';

exports.create = route(function*(req, res) {
  yield validateTrail(req);

  transaction(function*() {
    const trail = yield Trail.parse(req).save();
    res.status(201).send(serialize(req, trail, policy));
  });
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
