const Abstract = require('./abstract');
const bookshelf = require('../db');

const ButterflySpecies = Abstract.extend({
  tableName: 'butterfly_species',

  apiId: true,

  family: function() {
    return this.belongsTo('ButterflyFamily', 'family_id');
  }
});

module.exports = bookshelf.model('ButterflySpecies', ButterflySpecies);
