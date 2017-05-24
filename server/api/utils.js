const _ = require('lodash');

// TODO: rename this file to query/params

exports.includes = function(req, related) {

  let includes = req.query.include;
  if (!includes) {
    return false;
  }

  if (!_.isArray(includes)) {
    includes = [ includes ];
  }

  return _.includes(includes, related);
};
