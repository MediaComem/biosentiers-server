const _ = require('lodash');
const Excursion = require('../../models/excursion');
const utils = require('../utils');

exports.serialize = function(req, theme) {
  return {
    name: theme.get('name'),
    description: theme.get('description')
  };
};
