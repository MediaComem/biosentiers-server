const Abstract = require('./abstract');
const bookshelf = require('../db');

const ButterflyFamily = Abstract.extend({
  tableName: 'butterfly',

  taxonomyClass: function() {
    return this.belongsTo('TaxonomyClass', 'class_id');
  }
});

module.exports = bookshelf.model('ButterflyFamily', ButterflyFamily);
