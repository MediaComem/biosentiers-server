const Abstract = require('./abstract');
const bookshelf = require('../db');

const BirdFamily = Abstract.extend({
  tableName: 'bird_family',

  taxonomyClass: function() {
    return this.belongsTo('TaxonomyClass', 'class_id');
  }
});

module.exports = bookshelf.model('BirdFamily', BirdFamily);
