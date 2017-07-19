const _ = require('lodash');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const authTypes = [ 'user', 'invitation', 'passwordReset' ];

exports.generateToken = function(options) {

  const jwtOptions = _.extend({
    exp: options.exp || moment().add(1, 'hour').unix(),
    iat: new Date().getTime() / 1000
  }, options);

  if (!_.includes(authTypes, jwtOptions.authType)) {
    throw new Error(`JWT authentication type is required (one of ${authTypes.join(', ')}), got ${jwtOptions.authType}`);
  }

  return jwt.sign(jwtOptions, config.jwtSecret);
};
