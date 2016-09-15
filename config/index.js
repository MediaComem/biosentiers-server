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
  parseBoolean: parseConfigBoolean,
  parseInt: parseConfigInt
};

var base = {
  open: parseConfigBoolean(process.env.OPEN),
  openBrowser: process.env.OPEN_BROWSER,
  protocol: process.env.PROTOCOL,
  host: process.env.HOST,
  port: parseConfigInt(process.env.PORT)
};

var environment = require('./' + env)(_.merge({}, base, fixed));

var config = _.merge({}, base, environment, fixed);

config.url = config.protocol + '://' + config.host;
if (config.port && config.port != 80 && config.port != 443) {
  config.url = config.url + ':' + config.port;
}

module.exports = config;

function joinPathSegments() {
  var parts = Array.prototype.slice.call(arguments);
  return path.join.apply(path, [ root ].concat(parts));
}

function parseConfigBoolean(value) {
  if (value === undefined) {
    return undefined;
  } else if (!_.isString(value)) {
    return !!value;
  } else {
    return !!value.match(/^(1|y|yes|t|true)$/i);
  }
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
