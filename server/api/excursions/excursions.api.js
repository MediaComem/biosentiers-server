const _ = require('lodash');
const Excursion = require('../../models/excursion');
const fetcher = require('../fetcher');
const policy = require('./excursions.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Trail = require('../../models/trail');
const validate = require('../validate');
const validations = require('./excursions.validations');

// API resource name (used in some API errors).
exports.resourceName = 'excursion';

exports.create = route.transactional(function*(req, res) {
  yield validateExcursion(req);

  const excursion = Excursion.parse(req);
  excursion.set('creator_id', req.currentUser.get('id'));

  yield excursion.save();
  yield excursion.load([ 'creator', 'trail' ]);

  res.status(201).send(serialize(req, excursion, policy));
});

exports.list = route(function*(req, res) {

  const query = policy.scope(req);
  const excursions = yield new QueryBuilder(req, res, query)
    .paginate()
    .sort('name', 'createdAt', 'plannedAt', 'updatedAt')
    .eagerLoad([ 'creator', 'trail' ])
    .fetch();

  res.send(serialize(req, excursions, policy));
});

exports.retrieve = route(function*(req, res) {
  yield req.excursion.load([ 'creator', 'trail' ]);
  res.send(serialize(req, req.excursion, policy));
});

exports.update = route.transactional(function*(req, res) {
  yield req.excursion.load([ 'creator', 'trail' ]);
  yield validateExcursion(req, true);
  policy.parseRequestIntoRecord(req, req.excursion);
  yield req.excursion.save();
  res.send(serialize(req, req.excursion, policy));
});

exports.fetchExcursion = fetcher({
  model: Excursion,
  resourceName: 'excursion'
});

function validateExcursion(req, patchMode) {

  const excursion = req.excursion;

  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/trailId'),
        this.if(patchMode, this.while(this.isSet())),
        this.presence(),
        this.type('string'),
        this.resource(fetchTrailByApiId).replace(trail => trail.get('id'))
      ),
      this.validate(
        this.json('/name'),
        this.if(patchMode, this.while(this.isSet()), this.while(this.hasChanged(excursion ? excursion.get('name') : ''))),
        this.type('string')
      ),
      this.validate(
        this.json('/plannedAt'),
        this.if(patchMode, this.while(this.isSet()), this.while(this.hasChanged(excursion ? excursion.get('planned_at').toISOString() : ''))),
        this.presence(),
        this.type('string')
      ),
      this.validate(
        this.json('/themes'),
        this.while(this.isSet()),
        this.if(patchMode, this.while(this.hasChanged(excursion ? excursion.get('themes') : ''))),
        this.presence(),
        this.type('array'),
        validations.themesValid()
      ),
      this.validate(
        this.json('/zones'),
        this.while(this.isSet()),
        this.if(patchMode, this.while(this.hasChanged(excursion ? excursion.get('zones') : ''))),
        this.presence(),
        this.type('array'),
        validations.zonesValid()
      )
    );
  });
}

function fetchTrailByApiId(apiId) {
  return new Trail({
    api_id: apiId
  }).fetch();
}
