const Abstract = require('./abstract');
const bookshelf = require('../db');

const TaxonomyReign = Abstract.extend({
  tableName: 'reign'
});

module.exports = bookshelf.model('TaxonomyReign', TaxonomyReign);
