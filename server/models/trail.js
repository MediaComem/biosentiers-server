var Abstract = require('./abstract'),
    bookshelf = require('../db');

var Trail = Abstract.extend({
  tableName: 'trail',

  apiId: true,
  timestamps: true,

  parsing: {
    default: 'name'
  }
});

module.exports = bookshelf.model('Trail', Trail);
