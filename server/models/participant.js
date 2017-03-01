var Abstract = require('./abstract'),
    bookshelf = require('../db'),
    randomString = require('randomstring');

var proto = Abstract.prototype;

var Participant = Abstract.extend({
  tableName: 'participant',

  apiId: true,
  timestamps: true,

  parsing: {
    default: 'excursion name'
  },

  virtuals: {
    excursion: {
      get: function() {
        return this.related('excursion');
      },

      set: function(excursion) {
        this.relations.excursion = excursion;
        this.set('excursion_id', excursion.get('id'));
      }
    }
  },

  excursion: function() {
    return this.belongsTo('Excursion');
  },

  generateApiId: function() {
    const excursionId = this.get('excursion_id');
    return excursionId ? generateUniqueApiId(excursionId) : undefined;
  }
});

function generateUniqueApiId(excursionId) {
  const newApiId = randomString.generate({ length: 2, charset: 'alphanumeric', capitalization: 'lowercase' });
  return new Participant({ api_id: newApiId, excursion_id: excursionId }).fetch().then(function(existingParticipant) {
    return existingParticipant ? generateUniqueApiId(excursionId) : newApiId;
  });
}

module.exports = bookshelf.model('Participant', Participant);
