const Abstract = require('./abstract');
const bookshelf = require('../db');

const FloraFamily = Abstract.extend({
  tableName: 'flora_family',

  division: function() {
    return this.belongsTo('TaxonomyDivision', 'division_id');
  }
});

module.exports = bookshelf.model('FloraFamily', FloraFamily);
