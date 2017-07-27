const Abstract = require('./abstract');
const bookshelf = require('../db');

const FlowerSpecies = Abstract.extend({
  tableName: 'flower_species',

  family: function() {
    return this.belongsTo('FloraFamily', 'family_id');
  }
});

module.exports = bookshelf.model('FlowerSpecies', FlowerSpecies);
