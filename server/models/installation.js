const _ = require('lodash');
const Abstract = require('./abstract');
const bookshelf = require('../db');
const BPromise = require('bluebird');
const crypto = require('crypto');
const jwt = require('../lib/jwt');

const proto = Abstract.prototype;
const randomBytes = BPromise.promisify(crypto.randomBytes.bind(crypto));

const Installation = Abstract.extend({
  tableName: 'installation',

  apiId: true,
  hrefBase: '/api/installations',
  timestamps: true,

  defaults: {
    events_count: 0
  },

  events: function() {
    return this.hasMany('InstallationEvent');
  },

  initialize: function() {
    proto.initialize.apply(this, arguments);
    this.on('creating', this.initializeSharedSecret, this);
  },

  initializeSharedSecret: function() {
    return BPromise.resolve().then(generateSharedSecret).then(secret => this.set('shared_secret', secret));
  },

  updateProperties: function(properties) {
    return this.updateDynamicProperties('properties', properties);
  },

  generateJwt: function(options) {
    return jwt.generateToken(_.extend({
      authType: 'installation',
      sub: this.get('api_id')
    }, options));
  },

  updateEventsMetadata: function(events) {
    if (!this.get('id')) {
      throw new Error('Installation has not been saved');
    } else if (!_.isArray(events)) {
      throw new Error('Events must be an array');
    } else if (!events.length) {
      return Promise.resolve();
    }

    const maxDate = _.maxBy(events, event => event.get('occurred_at')).get('occurred_at');
    return bookshelf.knex.raw(`UPDATE ${this.tableName} SET events_count = events_count + ?, last_event_at = ? WHERE id = ?`, [ events.length, maxDate, this.get('id') ]);
  }
});

module.exports = bookshelf.model('Installation', Installation);

function generateSharedSecret() {
  return randomBytes(256);
}
