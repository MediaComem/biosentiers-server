const _ = require('lodash');
const config = require('../../config');
const db = require('../db');

const Promise = require('bluebird');
const Trail = require('../models/trail');

const logger = config.logger('script:sample-data');
const start = new Date().getTime();

process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const sampleTrail = {
  name: 'Le biosentier'
};

module.exports = Promise
  .resolve(createAdmin())
  .then(db.ensureConnected)
  .then(createTrail)
  .then(logSuccess)
  .catch(logError)
  .finally(db.disconnect);

function createAdmin() {
  return require('./create-admin');
}

function createTrail() {
  return new Trail(_.pick(sampleTrail, 'name')).fetch().then(function(trail) {
    if (trail) {
      logger.info(`Trail ${trail.get('name')} already exists`);
      return trail;
    }

    return new Trail({
      name: 'Le biosentier'
    }).save().then(function(trail) {
      logger.info(`Trail ${trail.get('name')} created`);
      return trail;
    });
  });
}

function logSuccess() {
  const duration = (new Date().getTime() - start) / 1000;
  logger.info(`Sample data generated in ${duration}s`)
}

function logError(err) {
  logger.error(err);
}

function disconnect() {
  return db.knex.destroy();
}
