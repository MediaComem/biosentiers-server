var _ = require('lodash'),
    api = require('../utils'),
    Excursion = require('../../models/excursion'),
    policy = require('./excursions.policy'),
    QueryBuilder = require('../query-builder'),
    Trail = require('../../models/trail'),
    validations = require('./excursions.validations');

var builder = api.builder(Excursion, 'excursions');

// API resource name (used in some API errors).
exports.name = 'excursion';

exports.create = builder.route(function(req, res, helper) {

  return validateExcursion(req.record, helper).then(create);

  function create() {
    return Excursion.transaction(function() {

      const excursion = Excursion.parse(req);
      excursion.set('creator_id', req.user.get('id'));

      return excursion
        .save()
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

exports.list = builder.route(function(req, res, helper) {
  return new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sort('name', 'createdAt', 'plannedAt', 'updatedAt')
    .eagerLoad([ 'creator', 'trail' ])
    .fetch()
    .map(helper.serializer(policy))
    .then(helper.ok());
});

exports.retrieve = builder.route(function(req, res, helper) {
  return Promise
    .resolve(req.record.load([ 'creator', 'trail' ]))
    .then(helper.serializer(policy))
    .then(helper.ok());
});

exports.update = builder.route(function(req, res, helper) {

  var excursion = req.record;
  return Promise
    .resolve(req.record.load([ 'creator', 'trail' ]))
    .then(_.partial(validateExcursion, _, helper, true))
    .then(update);

  function update() {
    helper.unserializeTo(excursion, [ 'trailId', 'plannedAt', 'name', 'themes', 'zones' ]);

    return excursion
      .save()
      .then(helper.serializer(policy))
      .then(helper.ok());
  }
});

exports.fetchRecord = builder.fetcher(exports.name);

function validateExcursion(excursion, helper, patchMode) {
  return helper.validateRequestBody(function() {
    return this.parallel(
      this.validate(
        this.json('/trailId'),
        this.if(patchMode, this.while(this.isSet()), this.while(this.hasChanged(excursion ? excursion.related('trail').get('api_id') : ''))),
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
