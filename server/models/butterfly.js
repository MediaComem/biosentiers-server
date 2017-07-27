const Abstract = require('./abstract');
const bookshelf = require('../db');

const Butterfly = Abstract.extend({
  tableName: 'butterfly',
  geometry: true,

  species: function() {
    return this.belongsTo('ButterflySpecies', 'species_id');
  }
});

module.exports = bookshelf.model('Butterfly', Butterfly);
