const _ = require('lodash');
const Abstract = require('./abstract');
const bookshelf = require('../db');
const randomString = require('randomstring');

const THEMES = [ 'bird', 'butterfly', 'flower', 'tree' ];
const THEMES_START = 0;
const ZONES_START = 16;

const Excursion = Abstract.extend({
  tableName: 'excursion',

  apiId: true,
  timestamps: true,

  creator: function() {
    return this.belongsTo('User', 'creator_id');
  },

  trail: function() {
    return this.belongsTo('Trail');
  },

  themes: function() {
    return this.belongsToMany('Theme', 'excursions_themes');
  },

  virtuals: {
    zones: {
      get: decodeZones,
      set: encodeZones
    }
  },

  generateApiId: generateUniqueApiId
});

function generateUniqueApiId() {
  const newApiId = randomString.generate({ length: 5, charset: 'alphanumeric', capitalization: 'lowercase' });
  return new Excursion({ api_id: newApiId }).fetch().then(function(existingExcursion) {
    return existingExcursion ? generateUniqueApiId() : newApiId;
  });
}

function decodeZones() {

  const zones = [];
  const bitmask = this.get('themes_and_zones_bitmask');
  _.times(15, (i) => {
    const mask = 1 << (ZONES_START + i);
    if ((bitmask & mask) != 0) {
      zones.push(i);
    }
  });

  return zones;
}

function encodeZones(zones) {

  let bitmask = this.get('themes_and_zones_bitmask');
  _.times(15, (i) => {
    const mask = 1 << (ZONES_START + i);
    if (_.includes(zones, i)) {
      bitmask = bitmask | mask;
    } else if ((bitmask & mask) != 0) {
      bitmask = bitmask ^ mask;
    }
  });

  this.set('themes_and_zones_bitmask', bitmask);
}

module.exports = bookshelf.model('Excursion', Excursion);
