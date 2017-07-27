const Abstract = require('./abstract');
const bookshelf = require('../db');

const Flower = Abstract.extend({
  tableName: 'flower',
  geometry: true,

  species: function() {
    return this.belongsTo('FlowerSpecies', 'species_id');
  }
});

module.exports = bookshelf.model('Flower', Flower);
