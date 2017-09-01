const BPromise = require('bluebird');
const config = require('../../config');
const db = require('../db');
const User = require('../models/user');

if (config.env != 'development') {
  throw new Error('This script should only be run during development');
}

const logger = config.logger('script:anonymize');

module.exports = db
  .ensureConnected()
  .then(anonymizeUsers)
  .then(logSuccess)
  .catch(logError)
  .finally(db.disconnect);

async function anonymizeUsers() {

  const users = await new User().fetchAll();

  await db.transaction(async function() {
    await BPromise.all(users.map(user => {
      return user.save('password', 'test', {
        patch: true
      });
    }));
  });
}

async function logSuccess(admin) {
  const count = await new User().count();
  logger.info(`${count} users anonymized`);
}

function logError(err) {
  logger.error(err);
}
