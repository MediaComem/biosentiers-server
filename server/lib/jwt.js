const _ = require('lodash');
const authTypes = require('./auth').types;
const config = require('../../config');
const jwt = require('jsonwebtoken');
const moment = require('moment');

exports.generateToken = function(options) {

  const jwtOptions = _.extend({
    exp: options.exp || moment().add(1, 'hour').unix(),
    iat: moment().unix()
  }, options);

  if (!_.includes(authTypes, jwtOptions.authType)) {
    throw new Error(`JWT authentication type is required (one of ${authTypes.join(', ')}), got ${jwtOptions.authType}`);
  }

  return jwt.sign(jwtOptions, config.jwtSecret);
};
