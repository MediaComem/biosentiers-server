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
    _.defaults(envVars, require('./local.env')(env));
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
  port: parseConfigInt(get('PORT')) || 3000,
  baseUrl: get('BASE_URL') || buildBaseUrl(),

  db: get('DATABASE_URI') || buildDatabaseUrl(),

  jwtSecret: get('SECRET') || 'changeme', // FIXME: no production default, validate
  bcryptCost: parseConfigInt(get('BCRYPT_COST')) || 10,

  logLevel: get('LOG_LEVEL'),

  browser: get('BROWSER'),

  apiDoc: {
    open: parseConfigBoolean(get('APIDOC_OPEN'), false),
    host: get('APIDOC_HOST') || 'localhost',
    port: parseConfigInt(get('APIDOC_PORT')) || 3001
  },

  mail: {
    enabled: parseConfigBoolean(get('SMTP_ENABLED'), true),
    host: get('SMTP_HOST'),
    port: parseConfigInt(get('SMTP_PORT')) || 0,
    secure: parseConfigBoolean(get('SMTP_SECURE'), false),
    username: get('SMTP_USERNAME'),
    password: get('SMTP_PASSWORD'),
    fromName: get('SMTP_FROM_NAME'),
    fromAddress: get('SMTP_FROM_ADDRESS')
  }
};

if (env == 'development') {
  // Development overrides.
  _.merge(config, {
    logLevel: config.logLevel || 'TRACE',
    apiDoc: {
      open: parseConfigBoolean(get('APIDOC_OPEN'), true)
    }
  });
} else if (env == 'production') {
  // Production overrides.
  _.merge(config, {
    logLevel: config.logLevel || 'INFO'
  });
} else if (env == 'test') {
  // Test overrides.
  _.merge(config, {
    bcryptCost: parseConfigInt(get('BCRYPT_COST')) || 1,
    logLevel: config.logLevel || 'WARN',
    mail: {
      enabled: false
    }
  });
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

function buildBaseUrl() {

  let url = (get('PROTOCOL') || 'http') + '://' + (get('HOST') || 'localhost');

  const port = parseConfigInt(get('PORT')) || 3000;
  if (port && port != 80 && port != 443) {
    url = url + ':' + port;
  }

  return url;
}

function buildDatabaseUrl() {

  let url = 'postgres://';

  const username = get('DATABASE_USERNAME');
  const password = get('DATABASE_PASSWORD');
  if (username && password) {
    url += `${username}:${password}@`
  }

  return `${url}${get('DATABASE_HOST') || 'localhost'}:${get('DATABASE_PORT') || '5432'}/${get('DATABASE_NAME') || 'biosentiers'}`
}

function get(varName) {
  if (_.has(envVars, varName)) {
    return envVars[varName];
  }

  const fileVarName = `${varName}_FILE`;
  if (!_.has(envVars, fileVarName)) {
    return undefined;
  }

  const file = envVars[fileVarName];

  try {
    if (fs.statSync(file).isFile()) {
      return fs.readFileSync(file, 'utf8').trim();
    }
  } catch (err) {
    // ignore
  }
}
