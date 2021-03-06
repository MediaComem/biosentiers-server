const Abstract = require('./abstract');
const bookshelf = require('../db');

const TreeSpecies = Abstract.extend({
  tableName: 'tree_species',

  apiId: true,

  family: function() {
    return this.belongsTo('FloraFamily', 'family_id');
  }
});

module.exports = bookshelf.model('TreeSpecies', TreeSpecies);
