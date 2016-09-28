// FIXME: validate config (e.g. required properties)
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
  protocol: process.env.PROTOCOL || 'http',
  host: process.env.HOST || 'localhost',
  port: parseConfigInt(process.env.PORT) || 3000,

  db: process.env.DATABASE_URI || 'postgres://localhost/biosentiers',

  jwtSecret: process.env.SECRET || 'changeme', // FIXME: no production default, validate
  bcryptCost: parseConfigInt(process.env.BCRYPT_COST) || 10,

  logLevel: process.env.LOG_LEVEL,

  liveReload: parseConfigBoolean(process.env.LIVERELOAD, false),
  open: parseConfigBoolean(process.env.OPEN, false),
  openBrowser: process.env.OPEN_BROWSER,

  mail: {
    enabled: parseConfigBoolean(process.env.SMTP_ENABLED, true),
    host: process.env.SMTP_HOST,
    port: parseConfigInt(process.env.SMTP_PORT) || 0,
    secure: !!(process.env.SMTP_SECURE || '0').match(/^(1|y|yes|t|true)$/i),
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME,
    fromAddress: process.env.SMTP_FROM_ADDRESS
  }
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
    logLevel: config.logLevel || 'TRACE',
    mail: {
      enabled: false
    }
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
