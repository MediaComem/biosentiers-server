const Abstract = require('./abstract');
const bookshelf = require('../db');

const Tree = Abstract.extend({
  tableName: 'tree',
  geometry: true
});

module.exports = bookshelf.model('Tree', Tree);
