const _ = require('lodash');
const policy = require('./themes.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const Theme = require('../../models/theme');
const utils = require('../utils');

// API resource name (used in some API errors)
exports.resourceName = 'theme';

exports.list = route(async function(req, res) {

  const themes = await new QueryBuilder(req, res, policy.scope(req))
    .filter(filterByNames)
    .paginate()
    .sorts('name')
    .defaultSort('name')
    .fetch();

  res.send(await serialize(req, themes, policy));
});

function filterByNames(query, req) {

  const names = utils.multiValueParam(req.query.name, _.isString);
  if (!names.length) {
    return;
  }

  return query.query(qb => qb.where('theme.name', 'in', names));
}
