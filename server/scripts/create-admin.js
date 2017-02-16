const config = require('../../config');
const db = require('../db');
const User = require('../models/user');
const valib = require('valib');

const logger = config.logger('script:create-admin');

// Take input from environment variables
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

let adminAlreadyExists = false;

module.exports = db
  .ensureConnected()
  .then(validateInput)
  .then(checkAdminExists)
  .then(createAdmin)
  .then(logSuccess)
  .catch(logError)
  .finally(db.disconnect);

function validateInput() {
  if (!valib.String.isEmailLike(adminEmail)) {
    throw new Error('$ADMIN_EMAIL must be an e-mail');
  } else if (!adminPassword) {
    throw new Error('$ADMIN_PASSWORD must be set');
  }
}

function checkAdminExists() {
  return new User({
    email: adminEmail
  }).fetch();
}

function createAdmin(existingUser) {
  if (existingUser) {
    adminAlreadyExists = true;
    return existingUser;
  }

  return new User({
    active: true,
    role: 'admin',
    email: adminEmail,
    password: adminPassword
  }).save();
}

function logSuccess(admin) {
  if (adminAlreadyExists) {
    logger.info(`Admin user ${admin.get('email')} already exists`);
  } else {
    logger.info(`Admin user ${admin.get('email')} successfully created`);
  }
}

function logError(err) {
  logger.error(err);
}
