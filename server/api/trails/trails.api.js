const _ = require('lodash');
const fetcher = require('../fetcher');
const np = require('../../lib/native-promisify');
const policy = require('./trails.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Trail = require('../../models/trail');
const validate = require('../validate');

// API resource name (used in some API errors)
exports.resourceName = 'trail';

exports.create = route.transactional(async function(req, res) {
  await np(validateTrail(req));
  const trail = await Trail.parseJson(req).save();
  res.status(201).send(serialize(req, trail, policy));
});

exports.list = route(async function(req, res) {

  const trails = await new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sort('createdAt', 'updatedAt')
    .fetch();

  res.send(serialize(req, trails, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(serialize(req, req.trail, policy));
});

exports.fetchTrail = fetcher({
  model: Trail,
  resourceName: 'trail'
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
