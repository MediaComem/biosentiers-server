const _ = require('lodash');

module.exports = function(req, data, serializer) {
  if (_.isFunction(serializer.serialize)) {
    serializer = serializer.serialize;
  } else if (!_.isFunction(serializer)) {
    throw new Error('Serializer must be a function or have a "serialize" property that is a function');
  }

  if (!_.isArray(data)) {
    return serializer(req, data);
  } else {
    return _.map(data, (item) => serializer(req, item));
  }
};
