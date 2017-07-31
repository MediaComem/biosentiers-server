const _ = require('lodash');

exports.includes = function(req, related, options) {
  const includesFromQuery = normalizeIncludes(req.query.include);
  const includesFromOptions = normalizeIncludes(_.get(options, 'include'));
  const includes = _.uniq(includesFromQuery.concat(includesFromOptions));
  return _.includes(includes, related);
};

exports.multiValue = function(value, filter, converter) {
  if (value === undefined) {
    return [];
  }

  converter = converter || _.identity;
  filter = filter || _.constant(true);
  value = _.isArray(value) ? value : [ value ];

  return _.uniq(_.map(_.filter(value, filter), converter)).sort();
};

function normalizeIncludes(includes) {
  return _.isArray(includes) ? includes : _.compact([ includes ]);
}
