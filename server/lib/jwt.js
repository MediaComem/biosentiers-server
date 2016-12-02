var _ = require('lodash'),
    config = require('../../config'),
    jwt = require('jsonwebtoken');

var authTypes = [ 'user', 'invitation' ];

exports.generateToken = function(options) {

  var jwtOptions = _.extend({
    iat: new Date().getTime()
  }, options);

  if (!_.includes(authTypes, jwtOptions.authType)) {
    throw new Error('JWT authentication type is required (one of ' + authTypes.join(', ') + ')')
  }

  return jwt.sign(jwtOptions, config.jwtSecret);
};
