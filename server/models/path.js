const Abstract = require('./abstract');
const bookshelf = require('../db');

const Path = Abstract.extend({
  tableName: 'path',

  type: function() {
    return this.belongsTo('PathType', 'type_id');
  },

  parse: function(response) {
    if (response.geom) {
      response.geom = this.constructor.parseGeoJson(response.geom);
    }

    return response;
  }
});

module.exports = bookshelf.model('Path', Path);
