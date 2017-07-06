const Abstract = require('./abstract');
const bookshelf = require('../db');

const Path = Abstract.extend({
  tableName: 'path',
  geometry: true,

  type: function() {
    return this.belongsTo('PathType', 'type_id');
  }
});

module.exports = bookshelf.model('Path', Path);
