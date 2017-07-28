const Abstract = require('./abstract');
const bookshelf = require('../db');
const BPromise = require('bluebird');
const crypto = require('crypto');

const proto = Abstract.prototype;
const randomBytes = BPromise.promisify(crypto.randomBytes.bind(crypto));

const Installation = Abstract.extend({
  tableName: 'installation',

  apiId: true,
  hrefBase: '/api/installations',
  timestamps: true,

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
  }
});

module.exports = bookshelf.model('Installation', Installation);

function generateSharedSecret() {
  return randomBytes(256);
}
