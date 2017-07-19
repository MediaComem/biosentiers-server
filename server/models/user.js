const _ = require('lodash');
const Abstract = require('./abstract');
const bcrypt = require('bcryptjs');
const bookshelf = require('../db');
const config = require('../../config');
const db = require('../db');
const jwt = require('../lib/jwt');

const availableRoles = [ 'user', 'admin' ];
const proto = Abstract.prototype;

const User = Abstract.extend({
  tableName: 'user_account',

  apiId: true,
  hrefBase: '/api/users',
  timestamps: true,

  defaults: {
    active: false,
    role: 'user'
  },

  virtuals: _.merge({
    password: {
      get: function() {
        return this._password;
      },

      set: function(password) {
        this._password = password;

        if (_.isString(password) && password.length) {
          const salt = bcrypt.genSaltSync(config.bcryptCost);
          this.set('password_hash', bcrypt.hashSync(password, salt));
        } else {
          this.unset('password_hash');
        }
      }
    }
  }, proto.virtuals),

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
  },

  incrementPasswordResetCount: function() {

    const id = this.get('id');
    if (!id) {
      throw new Error('User has not been saved');
    }

    return db.knex(this.tableName)
      .where('id', id)
      .increment('password_reset_count', 1)
      .then(() => {
        this.set('password_reset_count', this.get('password_reset_count') + 1);
        return this;
      });
  }
}, {
  roles: availableRoles
});

module.exports = bookshelf.model('User', User);
