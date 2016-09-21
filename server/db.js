var _ = require('lodash'),
    config = require('../config'),
    Sequelize = require('sequelize');

var logger = config.logger('db');

module.exports = new Sequelize(config.db, {
  logging: _.bind(logger.trace, logger)
});
