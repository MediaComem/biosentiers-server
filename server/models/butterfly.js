const Abstract = require('./abstract');
const bookshelf = require('../db');

const Butterfly = Abstract.extend({
  tableName: 'butterfly',
  geometry: true
});

module.exports = bookshelf.model('Butterfly', Butterfly);
