const Abstract = require('./abstract');
const bookshelf = require('../db');

const ZonePoint = Abstract.extend({
  tableName: 'zone_point',
  geometry: true,

  zone: function() {
    return this.belongsTo('Zone');
  }
});

module.exports = bookshelf.model('ZonePoint', ZonePoint);
