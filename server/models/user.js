const _ = require('lodash');
const Abstract = require('./abstract');
const bcrypt = require('bcryptjs');
const BPromise = require('bluebird');
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
    login_count: 0,
    password_reset_count: 0,
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
    ensureSaved(this);
    return db.knex(this.tableName)
      .where('id', this.get('id'))
      .increment('password_reset_count', 1)
      .then(() => {
        this.set('password_reset_count', this.get('password_reset_count') + 1);
        return this;
      });
  },

  saveNewActivity: function(activeAt) {
    ensureSaved(this);
    activeAt = activeAt || new Date();
    return db.knex(this.tableName)
      .where('id', this.get('id'))
      .update('last_active_at', activeAt)
      .then(() => {
        this.set('last_active_at', activeAt);
        return this;
      });
  },

  saveNewLogin: function(loginAt) {
    ensureSaved(this);
    loginAt = loginAt || new Date();
    return BPromise.all([
      db.knex(this.tableName).where('id', this.get('id')).update({
        last_login_at: loginAt,
        last_active_at: loginAt
      }),
      db.knex(this.tableName).where('id', this.get('id')).increment('login_count', 1)
    ])
      .then(() => {
        this.set('last_login_at', loginAt);
        this.set('last_active_at', loginAt);
        this.set('login_count', this.get('login_count') + 1);
        return this;
      });
  }
}, {
  roles: availableRoles
});

module.exports = bookshelf.model('User', User);

function ensureSaved(user) {
  if (!user.get('id')) {
    throw new Error('User has not been saved');
  }
}
