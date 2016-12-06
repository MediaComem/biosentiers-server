var _ = require('lodash'),
    api = require('../utils'),
    Excursion = require('../../models/excursion'),
    pagination = require('../pagination'),
    policy = require('./excursions.policy'),
    Trail = require('../../models/trail');

var builder = api.builder(Excursion, 'excursions');

// API resource name (used in some API errors).
exports.name = 'excursion';

exports.create = builder.route(function(req, res, helper) {

  return validate().then(create);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/trailId'), this.presence(), this.type('string')),
        this.validate(this.json('/plannedAt'), this.presence(), this.type('string'))
      );
    });
  }

  function create() {
    return Excursion.transaction(function() {
      return new Trail({ api_id: req.body.trailId }).fetch().then(function(trail) {

        var record = new Excursion({
          planned_at: req.body.plannedAt
        });

        record.relations.trail = trail;
        record.set('trail_id', trail.get('id'));

        return record
          .save()
          .then(helper.serializer(policy))
          .then(helper.created());
      });
    });
  }
});
