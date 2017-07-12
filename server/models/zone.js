const Abstract = require('./abstract');
const bookshelf = require('../db');

const Zone = Abstract.extend({
  apiId: true,
  hrefBase: '/api/zones',
  tableName: 'zone',
  geometry: true,

  excursions: function() {
    return this.belongsToMany('Excursion', 'excursions_zones');
  },

  points: function() {
    return this.hasMany('ZonePoint');
  },

  trails: function() {
    return this.belongsToMany('Trail', 'trails_zones').withPivot([ 'position' ]);
  }
});

module.exports = bookshelf.model('Zone', Zone);
