const _ = require('lodash');
const inflection = require('inflection');

exports.parseJsonIntoRecord = function(source, record, properties) {
  if (_.isArray(properties)) {
    properties = _.reduce(properties, function(memo, property) {
      memo[inflection.underscore(property)] = property;
      return memo;
    }, {});
  }

  _.each(properties, function(sourceProperty, recordProperty) {
    if (_.has(source, sourceProperty)) {
      record.set(recordProperty, source[sourceProperty]);
    }
  });

  return record;
};
