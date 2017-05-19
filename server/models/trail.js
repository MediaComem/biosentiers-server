const Abstract = require('./abstract');
const bookshelf = require('../db');

const Trail = Abstract.extend({
  tableName: 'trail',

  apiId: true,
  timestamps: true,

  parsing: {
    default: 'name'
  }
});

module.exports = bookshelf.model('Trail', Trail);
