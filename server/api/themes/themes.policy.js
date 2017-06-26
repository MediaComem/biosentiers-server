const _ = require('lodash');
const policy = require('../policy');
const Theme = require('../../models/theme');
const utils = require('../utils');

exports.canList = function(req) {
  return policy.authenticated(req);
};

exports.scope = function(req) {
  return new Theme();
};

exports.serialize = function(req, theme) {
  return {
    name: theme.get('name'),
    description: theme.get('description')
  };
};
