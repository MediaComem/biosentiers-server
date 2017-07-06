const Abstract = require('./abstract');
const bookshelf = require('../db');

const Bird = Abstract.extend({
  tableName: 'bird',
  geometry: true
});

module.exports = bookshelf.model('Bird', Bird);
