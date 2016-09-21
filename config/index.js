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
  // Immutable config data.
  env: env,
  root: root,
  version: pkg.version,
  mainAngularModule: 'bio',
  buildDir: path.join(root, 'build', env),
  // Utility functions.
  logger: createLogger,
  path: joinPathSegments,
  parseBoolean: parseConfigBoolean,
  parseInt: parseConfigInt
};

var config = {
  db: process.env.DATABASE_URI || 'postgres://localhost/biosentiers',
  protocol: process.env.PROTOCOL || 'http',
  host: process.env.HOST || 'localhost',
  logLevel: process.env.LOG_LEVEL,
  port: parseConfigInt(process.env.PORT) || 3000,
  liveReload: parseConfigBoolean(process.env.LIVERELOAD, false),
  open: parseConfigBoolean(process.env.OPEN, false),
  openBrowser: process.env.OPEN_BROWSER
};

if (env == 'development') {
  // Development overrides.
  var liveReloadPort = parseConfigInt(process.env.LIVERELOAD_PORT) || 35729;

  _.merge(config, {
    logLevel: config.logLevel || 'TRACE',
    liveReload: parseConfigBoolean(process.env.LIVERELOAD, true),
    liveReloadUrl: config.protocol + '://' + config.host + ':' + liveReloadPort + '/livereload.js',
    open: parseConfigBoolean(process.env.OPEN, true)
  });
} else if (env == 'production') {
  // Production overrides.
  _.merge(config, {
    logLevel: config.logLevel || 'INFO'
  });
} else if (env == 'test') {
  // Test overrides.
  _.merge(config, {
    logLevel: config.logLevel || 'TRACE'
  });
}

// Build the application's base URL.
config.url = config.protocol + '://' + config.host;
if (config.port && config.port != 80 && config.port != 443) {
  config.url = config.url + ':' + config.port;
}

// Export the configuration.
module.exports = _.merge(config, fixed);

function createLogger(name) {

  var logger = log4js.getLogger(name);

  if (config.logLevel) {
    logger.setLevel(config.logLevel);
  }

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
