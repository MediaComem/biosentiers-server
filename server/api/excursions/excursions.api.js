const _ = require('lodash');
const db = require('../../db');
const Excursion = require('../../models/excursion');
const fetcher = require('../fetcher');
const np = require('../../lib/native-promisify');
const policy = require('./excursions.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Theme = require('../../models/theme');
const Trail = require('../../models/trail');
const utils = require('../utils');
const validate = require('../validate');
const Zone = require('../../models/zone');

const EAGER_LOAD = [
  'creator',
  'themes',
  {
    trail: qb => qb.select('trail.*', db.st.asGeoJSON('geom')),
    zones: qb => qb.select('zone.*', db.st.asGeoJSON('geom'))
  }
];

// API resource name (used in some API errors).
exports.resourceName = 'excursion';

exports.create = route.transactional(async function(req, res) {
  await np(validateExcursion(req));

  const excursion = policy.parseRequestIntoRecord(req, new Excursion());
  excursion.set('creator_id', req.currentUser.get('id'));

  await saveExcursion(excursion, req);

  await excursion.load(EAGER_LOAD);
  res.status(201).send(await serialize(req, excursion, policy));
});

exports.list = route(async function(req, res) {

  const query = policy.scope(req);
  const excursions = await new QueryBuilder(req, res, query)
    .paginate()
    .sort('name', 'createdAt', 'plannedAt', 'updatedAt')
    .eagerLoad(EAGER_LOAD)
    .fetch();

  res.send(await serialize(req, excursions, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(await serialize(req, req.excursion, policy));
});

exports.update = route.transactional(async function(req, res) {
  await np(validateExcursion(req, true));

  policy.parseRequestIntoRecord(req, req.excursion);
  await saveExcursion(req.excursion, req);

  res.send(await serialize(req, req.excursion, policy));
});

exports.fetchExcursion = fetcher({
  model: Excursion,
  eagerLoad: EAGER_LOAD,
  resourceName: 'excursion'
});

function validateExcursion(req, patchMode) {

  const excursion = req.excursion;

  return validate.requestBody(req, function() {
    return this.series(
      // Pre-load themes
      validate.relatedArrayData('themes', preloadThemes()),
      // Validate the excursion (except the zones, see below this parallel call)
      this.parallel(
        this.validate(
          this.json('/trailId'),
          this.if(patchMode, this.while(this.isSet())),
          this.required(),
          this.type('string'),
          this.resource(fetchTrailByApiId).replace(trail => trail.get('id'))
        ),
        this.validate(
          this.json('/name'),
          this.if(patchMode, this.while(this.isSet()), this.while(this.changed(excursion ? excursion.get('name') : ''))),
          this.type('string')
        ),
        this.validate(
          this.json('/plannedAt'),
          this.if(patchMode, this.while(this.isSet()), this.while(this.changed(excursion ? excursion.get('planned_at').toISOString() : ''))),
          this.required(),
          this.type('string')
        ),
        this.validate(
          this.json('/themes'),
          this.ifElse(
            // If the excursion is new or themes have changed...
            validate.newOrChanged(patchMode, themesHaveChanged(excursion)),
            // Validate the themes
            this.each((c, value, i) => {
              return this.validate(
                this.json(`/${i}`),
                this.resource(validate.related('themes', 'name')).replace(_.identity)
              );
            }),
            // Otherwise remove them from the request body
            validate.remove()
          )
        )
      ),
      // Validate the zones (but only if the trail ID is valid, otherwise we cannot tell which zone positions are valid)
      this.if(
        this.noError({ location: '/trailId' }),
        validate.relatedArrayData('zones', preloadZones(excursion)),
        this.parallel(
          this.validate(
            this.json('/zones'),
            this.ifElse(
              // If the excursion is new or zones have changed...
              validate.newOrChanged(patchMode, zonesHaveChanged(excursion)),
              // Validate the zones
              this.each((c, value, i) => {
                return this.validate(
                  this.json(`/${i}`),
                  this.resource(validate.related('zones', findZoneByPosition)).replace(_.identity)
                );
              }),
              // Otherwise remove them from the request body
              validate.remove()
            )
          )
        )
      )
    );
  });
}

function preloadThemes() {
  return function(names) {
    return new Theme().where('name', 'in', names).fetchAll();
  };
}

function preloadZones(excursion) {
  return function(positions, context) {
    const trailId = context.get('value').trailId || excursion.get('trail_id');
    return new Trail({ id: trailId }).fetch().then(trail => {
      return trail.zones().query(qb => {
        return qb
          .select('zone.*', db.st.asGeoJSON('geom'))
          .where('trails_zones.position', 'in', positions);
      }).fetch();
    });
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

function findZoneByPosition(col, position) {
  return _.find(col.models, zone => zone.pivot.get('position') === position);
}

function fetchTrailByApiId(apiId) {
  return new Trail({ api_id: apiId }).fetch();
}

function saveExcursion(excursion, req) {
  return excursion.save().then(() => {
    return Promise.all([
      utils.updateManyToMany(excursion, 'themes', req.body.themes),
      utils.updateManyToMany(excursion, 'zones', req.body.zones)
    ]);
  });
}
