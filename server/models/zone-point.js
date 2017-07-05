const Abstract = require('./abstract');
const bookshelf = require('../db');

const ZonePoint = Abstract.extend({
  tableName: 'zone_point',

  zone: function() {
    return this.belongsTo('Zone');
  },

  parse: function(response) {
    if (response.geom) {
      response.geom = this.constructor.parseGeoJson(response.geom);
    }

    return response;
  }
});

module.exports = bookshelf.model('ZonePoint', ZonePoint);
