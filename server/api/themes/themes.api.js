const _ = require('lodash');
const policy = require('./themes.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Theme = require('../../models/theme');

// API resource name (used in some API errors)
exports.resourceName = 'theme';

exports.list = route(async function(req, res) {

  const themes = await new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .sorts('name')
    .defaultSort('name')
    .fetch();

  res.send(await serialize(req, themes, policy));
});
