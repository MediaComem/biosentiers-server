var _ = require('lodash'),
    generator = require('../generator'),
    spec = require('../utils'),
    Trail = require('../../models/trail');

exports.trail = function(data) {
  data = data || {};
  return spec.createRecord(Trail, {
    name: data.name || exports.name(),
    created_at: data.createdAt,
    updated_at: data.updatedAt
  });
};

exports.name = generator(function(i) {
  return 'Trail ' + i;
});
