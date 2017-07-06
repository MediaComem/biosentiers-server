const Abstract = require('./abstract');
const bookshelf = require('../db');

const Poi = Abstract.extend({
  tableName: 'poi'
});

module.exports = bookshelf.model('Poi', Poi);
