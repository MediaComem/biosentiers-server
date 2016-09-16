var config = require('../../config'),
    log4js = require('log4js');

var logger = config.logger('express');

module.exports = log4js.connectLogger(logger, {
  level: log4js.levels.TRACE,
  format: ':method :url :status :response-time ms'
});
