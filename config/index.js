const _ = require('lodash');
const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const log4js = require('log4js');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const pkg = require(path.join('..', 'package'));
const root = path.normalize(path.join(__dirname, '..'));

const envs = 'development production test'.split(/\s+/);
if (!_.includes(envs, env)) {
  throw new Error('Unsupported environment ' + JSON.stringify(env) + '; must be one of ' + envs.join(', '));
}

dotenv.config();

const envVars = _.clone(process.env);
try {
  if (fs.statSync(path.join(__dirname, 'local.env.js'))) {
    _.defaults(envVars, require('./local.env')(env));
  }
} catch (e) {
  // ignore
}

const fixed = {
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
  parseInt: parseConfigInt,
  validate: validate
};

const config = {
  port: parseConfigInt(get('PORT'), 3000),
  baseUrl: get('BASE_URL') || buildBaseUrl(),

  db: get('DATABASE_URL') || buildDatabaseUrl(),

  jwtSecret: get('SECRET'),
  bcryptCost: parseConfigInt(get('BCRYPT_COST'), 10),
  installationAuthThreshold: parseConfigInt(get('INSTALLATION_AUTH_THRESHOLD'), 300000),
  installationAuthAlgorithm: get('INSTALLATION_AUTH_ALGORITHM') || 'sha512',

  logLevel: get('LOG_LEVEL'),

  browser: get('BROWSER'),

  apiDoc: {
    open: parseConfigBoolean(get('APIDOC_OPEN'), false),
    host: get('APIDOC_HOST') || 'localhost',
    port: parseConfigInt(get('APIDOC_PORT'), 3001)
  },

  mail: {
    html: parseConfigBoolean(get('MAIL_HTML'), false),
    enabled: parseConfigBoolean(get('SMTP_ENABLED'), true),
    host: get('SMTP_HOST'),
    port: parseConfigInt(get('SMTP_PORT'), 0),
    secure: parseConfigBoolean(get('SMTP_SECURE'), false),
    username: get('SMTP_USERNAME'),
    password: get('SMTP_PASSWORD'),
    fromName: get('SMTP_FROM_NAME') || 'BioSentiers',
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
    bcryptCost: parseConfigInt(get('BCRYPT_COST'), 1),
    logLevel: config.logLevel || 'WARN',
    mail: {
      enabled: false
    }
  });
}

validate();

// Export the configuration.
module.exports = _.merge(config, fixed);

function createLogger(name) {

  const logger = log4js.getLogger(name);

  if (config.logLevel) {
    logger.level = config.logLevel;
  }

  return logger;
}

function joinPathSegments() {
  const parts = _.toArray(arguments);
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

function parseConfigInt(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (_.isNaN(parsed)) {
    throw new Error(value + ' is not a valid integer');
  }

  return parsed;
}

function buildBaseUrl() {

  let url = (get('PROTOCOL') || 'http') + '://' + (get('HOST') || 'localhost');

  const port = parseConfigInt(get('PORT'), 3000);
  if (port && port != 80 && port != 443) {
    url = url + ':' + port;
  }

  return url;
}

function buildDatabaseUrl() {

  let url = 'postgres://';

  const username = get('DATABASE_USERNAME');
  if (username) {
    url += username;

    const password = get('DATABASE_PASSWORD');
    if (username && password) {
      url += `:${password}`;
    }

    url += '@';
  }

  const host = get('DATABASE_HOST');
  const port = get('DATABASE_PORT');
  if (host || port) {
    url += `${host || 'localhost'}:${port || 5432}`;
  }

  return `${url}/${get('DATABASE_NAME') || 'biosentiers'}`
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

// FIXME: validate config (e.g. required properties)
function validate() {
  if (!_.isString(config.jwtSecret) || config.jwtSecret.match(/^\s*$/)) {
    throw new Error('JWT secret is required');
  }

  const hashes = crypto.getHashes();
  if (!_.includes(hashes, config.installationAuthAlgorithm)) {
    throw new Error(`${config.installationAuthAlgorithm} is not a supported hash algorithm; possible values are ${hashes.join(', ')}`);
  }
}
