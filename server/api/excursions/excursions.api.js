const _ = require('lodash');
const Excursion = require('../../models/excursion');
const fetcher = require('../fetcher');
const policy = require('./excursions.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Theme = require('../../models/theme');
const Trail = require('../../models/trail');
const utils = require('../utils');
const validate = require('../validate');
const Zone = require('../../models/zone');

const EAGER_LOAD = [ 'creator', 'themes', 'trail', 'zones' ];

// API resource name (used in some API errors).
exports.resourceName = 'excursion';

exports.create = route.transactional(function*(req, res) {
  yield validateExcursion(req);

  const excursion = policy.parseRequestIntoRecord(req, new Excursion());
  excursion.set('creator_id', req.currentUser.get('id'));

  yield saveExcursion(excursion, req);

  yield excursion.load(EAGER_LOAD);
  res.status(201).send(serialize(req, excursion, policy));
});

exports.list = route(function*(req, res) {

  const query = policy.scope(req);
  const excursions = yield new QueryBuilder(req, res, query)
    .paginate()
    .sort('name', 'createdAt', 'plannedAt', 'updatedAt')
    .eagerLoad(EAGER_LOAD)
    .fetch();

  res.send(serialize(req, excursions, policy));
});

exports.retrieve = route(function*(req, res) {
  res.send(serialize(req, req.excursion, policy));
});

exports.update = route.transactional(function*(req, res) {
  yield validateExcursion(req, true);

  policy.parseRequestIntoRecord(req, req.excursion);
  yield saveExcursion(req.excursion, req);

  res.send(serialize(req, req.excursion, policy));
});

exports.fetchExcursion = fetcher({
  model: Excursion,
  eagerLoad: EAGER_LOAD,
  resourceName: 'excursion'
});

function validateExcursion(req, patchMode) {

  const excursion = req.excursion;

  return validate.requestBody(req, function(context) {
    return this.parallel(
      validate.loadRelatedArray(context, 'themes', _.get(req.body, 'themes'), (names) => new Theme().where('name', 'in', names).fetchAll()),
      // FIXME: scope zones by trail id
      validate.loadRelatedArray(context, 'zones', _.get(req.body, 'zones'), (positions) => new Zone().where('position', 'in', positions).fetchAll())
    ).then(() => {
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
          this.ifElse(
            newOrChanged(excursion, patchMode, themesHaveChanged(excursion)),
            (c) => {
              return c.validate(
                this.presence(),
                this.type('array'),
                validate.each(function(value, i) {
                  return this.validate(
                    this.json(`/${i}`),
                    this.resource(validate.preloaded(context, 'themes', 'name')).replace(_.identity)
                  );
                })
              );
            },
            remove()
          )
        ),
        this.validate(
          this.json('/zones'),
          this.ifElse(
            newOrChanged(excursion, patchMode, zonesHaveChanged(excursion)),
            (c) => {
              return c.validate(
                this.presence(),
                this.type('array'),
                validate.each(function(value, i) {
                  return this.validate(
                    this.json(`/${i}`),
                    this.resource(validate.preloaded(context, 'zones', 'position')).replace(_.identity)
                  );
                })
              );
            },
            remove()
          )
        )
      );
    });
  });
}

function newOrChanged(excursion, patchMode, value) {
  return function(context) {
    if (!patchMode) {
      return true;
    } else if (!context.get('valueSet')) {
      return false;
    } else if (!_.isFunction(value)) {
      return context.get('value') !== value;
    } else {
      return value(context.get('value'), excursion);
    }
  };
}

function remove() {
  return function(context) {
    context.get('location').setValue(null);
  };
}

function themesHaveChanged(excursion) {
  return function(themes) {
    return !_.isEqual(_.uniq(excursion.related('themes').pluck('name')).sort(), _.uniq(themes).sort());
  };
}

function zonesHaveChanged(excursion) {
  return function(zones) {
    return !_.isEqual(_.uniq(excursion.related('zones').pluck('position')).sort(), _.uniq(zones).sort());
  };
}

function fetchTrailByApiId(apiId) {
  return new Trail({
    api_id: apiId
  }).fetch();
}

function saveExcursion(excursion, req) {
  return excursion.save().then(() => {
    return Promise.all([
      utils.updateManyToMany(excursion, 'themes', req.body.themes),
      utils.updateManyToMany(excursion, 'zones', req.body.zones)
    ]);
  });
}
