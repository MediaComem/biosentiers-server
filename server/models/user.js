var _ = require('lodash'),
    Abstract = require('./abstract'),
    bcrypt = require('bcryptjs'),
    bookshelf = require('../db'),
    config = require('../../config'),
    jwt = require('jsonwebtoken');

var availableRoles = [ 'user', 'admin' ];

var User = Abstract.extend({
  tableName: 'user_account',

  apiId: true,
  timestamps: true,

  defaults: {
    active: false,
    role: 'user'
  },

  parsing: {
    create: 'email',
    update: 'active email password'
  },

  virtuals: {
    password: {
      get: function() {
        return this._password;
      },

      set: function(password) {
        this._password = password;

        if (_.isString(password) && password.length) {
          var salt = bcrypt.genSaltSync(config.bcryptCost);
          this.set('password_hash', bcrypt.hashSync(password, salt));
        } else {
          this.unset('password_hash');
        }
      }
    },
  },

  hasRole: function(role) {
    return _.includes(availableRoles, role) && this.get('role') === role;
  },

  hasPassword: function(password) {
    return password && bcrypt.compareSync(password, this.get('password_hash'))
  },

  isActive: function() {
    return !!this.get('active');
  },

  isRegistered: function() {
    return this.has('password_hash');
  },

  generateJwt: function() {
    return generateJwt(this, {
      authType: 'user'
    });
  },

  generateRegistrationJwt: function() {
    return generateJwt(this, {
      authType: 'registrationOtp'
    });
  }
});

module.exports = bookshelf.model('User', User);

function generateJwt(user, options) {

  var jwtOptions = _.extend({
    sub: user.get('api_id'),
    iat: new Date().getTime()
  }, options);

  return jwt.sign(jwtOptions, config.jwtSecret);
}
