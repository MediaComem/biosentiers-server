const _ = require('lodash');
const generator = require('../generator');
const spec = require('../utils');
const Trail = require('../../models/trail');

exports.trail = function(data) {
  data = data || {};
  return spec.createRecord(Trail, {
    name: data.name || exports.name(),
    created_at: data.createdAt,
    updated_at: data.updatedAt
  });
};

exports.name = generator.incremental(function(i) {
  return 'Trail ' + i;
});
