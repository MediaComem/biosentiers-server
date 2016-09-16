var _ = require('lodash'),
    log4js = require('log4js'),
    path = require('path');

var env = process.env.NODE_ENV || 'development',
    pkg = require(path.join('..', 'package')),
    root = path.normalize(path.join(__dirname, '..'));

var envs = 'development production test'.split(/\s+/);
if (!_.includes(envs, env)) {
  throw new Error('Unsupported environment ' + JSON.stringify(env) + '; must be one of ' + envs.join(', '));
}

var fixed = {
  env: env,
  root: root,
  version: pkg.version,
  mainAngularModule: 'bio',
  logger: createLogger,
  buildDir: path.join(root, 'build', env),
  path: joinPathSegments,
  parseBoolean: parseConfigBoolean,
  parseInt: parseConfigInt
};

var base = {
  open: parseConfigBoolean(process.env.OPEN, true),
  openBrowser: process.env.OPEN_BROWSER,
  protocol: process.env.PROTOCOL || 'http',
  host: process.env.HOST || 'localhost',
  port: parseConfigInt(process.env.PORT) || 3000,
  logLevel: process.env.LOG_LEVEL
};

var environment = require('./' + env)(_.merge({}, base, fixed));

var config = _.merge({}, base, environment, fixed);

config.url = config.protocol + '://' + config.host;
if (config.port && config.port != 80 && config.port != 443) {
  config.url = config.url + ':' + config.port;
}

module.exports = config;

function createLogger(name) {
  var logger = log4js.getLogger(name);
  logger.setLevel(config.logLevel);
  return logger;
}

function joinPathSegments() {
  var parts = Array.prototype.slice.call(arguments);
  return path.join.apply(path, [ root ].concat(parts));
}

function parseConfigBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
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
