const Abstract = require('./abstract');
const bookshelf = require('../db');

const Tree = Abstract.extend({
  tableName: 'tree',
  geometry: true,

  species: function() {
    return this.belongsTo('TreeSpecies', 'species_id');
  }
});

module.exports = bookshelf.model('Tree', Tree);
