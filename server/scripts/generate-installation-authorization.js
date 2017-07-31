const config = require('../../config');
const crypto = require('crypto');
const db = require('../db');
const Installation = require('../models/installation');
const uuid = require('uuid');

const logger = config.logger('script:generate-installation-authorization');

const installationId = process.argv[2];

module.exports = db
  .ensureConnected()
  .then(validateInput)
  .then(loadInstallation)
  .then(createAuth)
  .catch(logError)
  .finally(db.disconnect);

function validateInput() {
  if (!installationId) {
    throw new Error('The installation ID must be provided as the first argument');
  }
}

function loadInstallation() {
  return new Installation({ api_id: installationId }).fetch().then(installation => {
    if (!installation) {
      throw new Error(`No installation found with ID ${installationId}`);
    }

    return installation;
  });
}

function createAuth(installation) {

  const nonce = uuid.v4();
  const date = new Date().toISOString();

  const hmac = crypto.createHmac(config.installationAuthAlgorithm, installation.get('shared_secret'));
  hmac.update(`${nonce};${date}`);

  console.log(JSON.stringify({
    installation: installation.get('api_id'),
    date: date,
    nonce: nonce,
    authorization: hmac.digest('hex')
  }));
}

function logError(err) {
  logger.error(err);
}
