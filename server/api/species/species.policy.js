const _ = require('lodash');
const policy = require('../policy');

exports.canList = function(req) {
  return true;
};

exports.serialize = function(req, species, options) {
  return species;
};
