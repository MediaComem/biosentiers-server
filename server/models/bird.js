const Abstract = require('./abstract');
const bookshelf = require('../db');

const Bird = Abstract.extend({
  tableName: 'bird',
  geometry: true,

  species: function() {
    return this.belongsTo('BirdSpecies', 'species_id');
  }
});

module.exports = bookshelf.model('Bird', Bird);
