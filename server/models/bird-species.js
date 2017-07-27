const Abstract = require('./abstract');
const bookshelf = require('../db');

const BirdSpecies = Abstract.extend({
  tableName: 'bird_species',

  family: function() {
    return this.belongsTo('BirdFamily', 'family_id');
  },

  height: function() {
    return this.belongsTo('BirdHeight', 'height_id');
  }
});

module.exports = bookshelf.model('BirdSpecies', BirdSpecies);
