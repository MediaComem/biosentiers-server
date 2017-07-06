const Abstract = require('./abstract');
const bookshelf = require('../db');

const Flower = Abstract.extend({
  tableName: 'flower',
  geometry: true
});

module.exports = bookshelf.model('Flower', Flower);
