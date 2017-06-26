const Abstract = require('./abstract');
const bookshelf = require('../db');

const PathType = Abstract.extend({
  tableName: 'path_type'
});

module.exports = bookshelf.model('PathType', PathType);
