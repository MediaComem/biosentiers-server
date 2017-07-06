const Abstract = require('./abstract');
const bookshelf = require('../db');

const Zone = Abstract.extend({
  tableName: 'zone',

  excursions: function() {
    return this.belongsToMany('Excursion', 'excursions_zones');
  },

  points: function() {
    return this.hasMany('ZonePoint');
  },

  trails: function() {
    return this.belongsToMany('Trail', 'trails_zones').withPivot([ 'position' ]);
  },

  parse: function(response) {
    if (response.geom) {
      response.geom = this.constructor.parseGeoJson(response.geom);
    }

    return response;
  }
});

module.exports = bookshelf.model('Zone', Zone);
