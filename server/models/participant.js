const Abstract = require('./abstract');
const bookshelf = require('../db');
const increment = require('./counters').increment;
const decrement = require('./counters').decrement;
const randomString = require('randomstring');

const proto = Abstract.prototype;

const Participant = Abstract.extend({
  tableName: 'participant',

  apiId: true,
  timestamps: true,

  constructor: function() {
    proto.constructor.apply(this, arguments);
    this.on('creating', () => increment('excursion', this.get('excursion_id'), 'participants'));
    this.on('destroying', () => decrement('excursion', this.get('excursion_id'), 'participants'));
  },

  excursion: function() {
    return this.belongsTo('Excursion');
  },

  generateApiId: function() {
    const excursionId = this.get('excursion_id');
    return excursionId ? generateUniqueApiId(excursionId) : undefined;
  },

  whereName: function(name) {
    return this.query(function(builder) {
      return builder.whereRaw('LOWER(name) = LOWER(?)', name);
    });
  }
});

function generateUniqueApiId(excursionId) {
  const newApiId = randomString.generate({ length: 2, charset: 'alphanumeric', capitalization: 'lowercase' });
  return new Participant({ api_id: newApiId, excursion_id: excursionId }).fetch().then(function(existingParticipant) {
    return existingParticipant ? generateUniqueApiId(excursionId) : newApiId;
  });
}

module.exports = bookshelf.model('Participant', Participant);
