const _ = require('lodash');
const dataPackage = require('./trails.data-package');
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
  const trail = policy.parse(req);
  await trail.save();
  res.status(201).send(await serialize(req, trail, policy));
});

exports.list = route(async function(req, res) {

  const trails = await new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sorts('name', 'createdAt', 'updatedAt')
    .sort('length', 'pathLength')
    .defaultSort('name')
    .fetch();

  res.send(await serialize(req, trails, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(await serialize(req, req.trail, policy));
});

exports.retrieveDataPackage = route(async function(req, res) {
  res.send(await dataPackage(req));
});

exports.fetchTrail = fetcher({
  model: Trail,
  resourceName: exports.resourceName
});

function validateTrail(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/name'),
        this.required(),
        this.type('string'),
        this.notEmpty()
      ),
      this.validate(
        this.json('/geometry'),
        this.required(),
        this.type('object'),
        this.validate(
          this.json('/type'),
          this.required(),
          this.type('string'),
          this.inclusion('MultiLineString')
        )
      )
    );
  });
}
