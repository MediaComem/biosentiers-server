const Abstract = require('./abstract');
const bookshelf = require('../db');

const TaxonomyClass = Abstract.extend({
  tableName: 'class',

  reign: function() {
    return this.belongsTo('TaxonomyReign', 'reign_id');
  }
});

module.exports = bookshelf.model('TaxonomyClass', TaxonomyClass);
