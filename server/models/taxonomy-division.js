const Abstract = require('./abstract');
const bookshelf = require('../db');

const TaxonomyDivision = Abstract.extend({
  tableName: 'division',

  reign: function() {
    return this.belongsTo('TaxonomyReign', 'reign_id');
  }
});

module.exports = bookshelf.model('TaxonomyDivision', TaxonomyDivision);
