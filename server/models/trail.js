const Abstract = require('./abstract');
const bookshelf = require('../db');
const geoJsonLength = require('geojson-length');
const wellKnown = require('wellknown');

const proto = Abstract.prototype;

const Trail = Abstract.extend({
  tableName: 'trail',
  geometry: true,

  apiId: true,
  timestamps: true,

  constructor: function() {
    proto.constructor.apply(this, arguments);
    this.on('saving', () => this.autoSetLength());
  },

  format: function(attributes) {
    attributes = proto.format.call(this, attributes);

    // TODO: move to Abstract
    if (attributes.geom) {
      attributes.geom = bookshelf.st.geomFromText(wellKnown.stringify(attributes.geom), 4326);
    }

    return attributes;
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
