const _ = require('lodash');
const policy = require('./themes.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Theme = require('../../models/theme');

// API resource name (used in some API errors)
exports.resourceName = 'theme';

exports.list = route(function*(req, res) {

  const themes = yield new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sort('name')
    .fetch();

  res.send(serialize(req, themes, policy));
});
