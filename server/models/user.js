var _ = require('lodash'),
    Abstract = require('./abstract'),
    bcrypt = require('bcryptjs'),
    bookshelf = require('../db'),
    config = require('../../config'),
    jwt = require('../lib/jwt');

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
    default: 'active email password role'
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
    }
  },

  hasRole: function(role) {
    return _.includes(availableRoles, role) && this.get('role') === role;
  },

  hasPassword: function(password) {
    return password && bcrypt.compareSync(password, this.get('password_hash'));
  },

  isActive: function() {
    return !!this.get('active');
  },

  isRegistered: function() {
    return this.has('password_hash');
  },

  generateJwt: function(options) {
    return jwt.generateToken(_.extend({
      authType: 'user',
      sub: this.get('api_id')
    }, options));
  },

  whereEmail: function(email) {
    return this.query(function(builder) {
      return builder.whereRaw('LOWER(email) = LOWER(?)', email);
    });
  }
}, {
  roles: availableRoles
});

module.exports = bookshelf.model('User', User);
