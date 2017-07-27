const Abstract = require('./abstract');
const bookshelf = require('../db');

const Owner = Abstract.extend({
  tableName: 'owner'
});

module.exports = bookshelf.model('Owner', Owner);
