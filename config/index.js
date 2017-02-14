// FIXME: validate config (e.g. required properties)
var _ = require('lodash'),
    fs = require('fs'),
    log4js = require('log4js'),
    path = require('path');

var env = process.env.NODE_ENV || 'development',
    pkg = require(path.join('..', 'package')),
    root = path.normalize(path.join(__dirname, '..'));

var envs = 'development production test'.split(/\s+/);
if (!_.includes(envs, env)) {
  throw new Error('Unsupported environment ' + JSON.stringify(env) + '; must be one of ' + envs.join(', '));
}

var envVars = _.clone(process.env);
try {
  if (fs.statSync(path.join(__dirname, 'local.env.js'))) {
    _.extend(envVars, require('./local.env')(env));
  }
} catch (e) {
  // ignore
}

var fixed = {
  // Immutable config data.
  env: env,
  root: root,
  version: pkg.version,
  mainAngularModule: 'bio',
  publicDir: path.join(root, 'public'),
  // Utility functions.
  logger: createLogger,
  path: joinPathSegments,
  parseBoolean: parseConfigBoolean,
  parseInt: parseConfigInt
};

var config = {
  protocol: envVars.PROTOCOL || 'http',
  host: envVars.HOST || 'localhost',
  port: parseConfigInt(envVars.PORT) || 3000,

  db: envVars.DATABASE_URI || 'postgres://localhost/biosentiers',

  jwtSecret: envVars.SECRET || 'changeme', // FIXME: no production default, validate
  bcryptCost: parseConfigInt(envVars.BCRYPT_COST) || 10,

  logLevel: envVars.LOG_LEVEL,

  open: parseConfigBoolean(envVars.OPEN, false),
  openBrowser: envVars.OPEN_BROWSER,

  mail: {
    enabled: parseConfigBoolean(envVars.SMTP_ENABLED, true),
    host: envVars.SMTP_HOST,
    port: parseConfigInt(envVars.SMTP_PORT) || 0,
    secure: !!(envVars.SMTP_SECURE || '0').match(/^(1|y|yes|t|true)$/i),
    username: envVars.SMTP_USERNAME,
    password: envVars.SMTP_PASSWORD,
    fromName: envVars.SMTP_FROM_NAME,
    fromAddress: envVars.SMTP_FROM_ADDRESS
  }
};

if (env == 'development') {
  // Development overrides.
  _.merge(config, {
    logLevel: config.logLevel || 'TRACE',
    open: parseConfigBoolean(envVars.OPEN, true)
  });
} else if (env == 'production') {
  // Production overrides.
  _.merge(config, {
    logLevel: config.logLevel || 'INFO'
  });
} else if (env == 'test') {
  // Test overrides.
  _.merge(config, {
    bcryptCost: parseConfigInt(envVars.BCRYPT_COST) || 1,
    logLevel: config.logLevel || 'WARN',
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
  var parts = _.toArray(arguments);
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
