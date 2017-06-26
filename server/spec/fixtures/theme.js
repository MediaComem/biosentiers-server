const _ = require('lodash');
const chance = require('../chance');
const generator = require('../generator');
const spec = require('../utils');
const Theme = require('../../models/theme');

exports.theme = function(data) {
  data = data || {};
  return spec.createRecord(Theme, {
    name: exports.name(),
    description: chance.sentence({ words: 4 })
  });
};

exports.name = generator.unique(function() {
  return chance.word();
});
