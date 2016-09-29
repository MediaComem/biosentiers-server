var config = require('../../config'),
    db = require('../db'),
    User = require('../models/user'),
    valib = require('valib');

var logger = config.logger('script:createAdmin');

db
  .ensureConnected()
  .then(validateInput)
  .then(createAdmin)
  .then(logSuccess)
  .catch(logError)
  .finally(disconnect);

function validateInput() {
  if (!valib.String.isEmailLike(process.env.ADMIN_EMAIL)) {
    throw new Error('$ADMIN_EMAIL must be an e-mail');
  } else if (!process.env.ADMIN_PASSWORD) {
    throw new Error('$ADMIN_PASSWORD must be set');
  }
}

function createAdmin() {
  return new User({
    active: true,
    role: 'admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  }).save();
}

function disconnect() {
  return db.knex.destroy();
}

function logSuccess(admin) {
  logger.info('Admin user ' + admin.get('email') + ' successfully created');
}

function logError(err) {
  logger.error(err);
}
