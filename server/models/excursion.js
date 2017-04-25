var Abstract = require('./abstract'),
    bookshelf = require('../db'),
    randomString = require('randomstring');

var proto = Abstract.prototype;

var Excursion = Abstract.extend({
  tableName: 'excursion',

  apiId: true,
  timestamps: true,

  parsing: {
    default: 'trail_id planned_at'
  },

  trail: function() {
    return this.belongsTo('Trail');
  },

  generateApiId: generateUniqueApiId
});

function generateUniqueApiId() {
  const newApiId = randomString.generate({ length: 5, charset: 'alphanumeric', capitalization: 'lowercase' });
  return new Excursion({ api_id: newApiId }).fetch().then(function(existingExcursion) {
    return existingExcursion ? generateUniqueApiId() : newApiId;
  });
}

module.exports = bookshelf.model('Excursion', Excursion);
