const Abstract = require('./abstract');
const bookshelf = require('../db');
const geoJsonLength = require('geojson-length');

const proto = Abstract.prototype;

const Trail = Abstract.extend({
  tableName: 'trail',
  geometry: true,

  apiId: true,
  hrefBase: '/api/trails',
  timestamps: true,

  initialize: function() {
    proto.initialize.apply(this, arguments);
    this.on('saving', () => this.autoSetLength());
  },

  zones: function() {
    return this.belongsToMany('Zone', 'trails_zones').withPivot([ 'position' ]);
  },

  autoSetLength: function() {
    if (this.hasChanged('geom')) {
      this.set('path_length', Math.round(geoJsonLength(this.get('geom'))));
    }
  }
});

module.exports = bookshelf.model('Trail', Trail);
