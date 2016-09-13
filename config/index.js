var _ = require('lodash'),
    path = require('path');

var env = process.env.NODE_ENV || 'development',
    pkg = require(path.join('..', 'package')),
    root = path.normalize(path.join(__dirname, '..'));

var fixed = {
  env: env,
  root: root,
  version: pkg.version,
  path: joinPathSegments,
  parseInt: parseConfigInt
};

var base = {
  port: parseConfigInt(process.env.PORT) || 3000
};

var environment = require('./' + env)(_.merge({}, base, fixed));

module.exports = _.merge({}, base, environment, fixed);

function joinPathSegments() {
  var parts = Array.prototype.slice.call(arguments);
  return path.join.apply(path, [ root ].concat(parts));
}

function parseConfigInt(value) {
  if (value === undefined) {
    return undefined;
  }

  var parsed = parseInt(value, 10);
  if (_.isNaN(parsed)) {
    throw new Error(value + ' is not a valid integer');
  }

  return parsed;
}
