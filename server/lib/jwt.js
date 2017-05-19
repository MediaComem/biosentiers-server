const _ = require('lodash');
const config = require('../../config');
const jwt = require('jsonwebtoken');

const authTypes = [ 'user', 'invitation' ];

exports.generateToken = function(options) {

  const jwtOptions = _.extend({
    iat: new Date().getTime()
  }, options);

  if (!_.includes(authTypes, jwtOptions.authType)) {
    throw new Error('JWT authentication type is required (one of ' + authTypes.join(', ') + ')');
  }

  return jwt.sign(jwtOptions, config.jwtSecret);
};
