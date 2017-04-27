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

  parsing: {
    default: 'trail_id planned_at name themes zones'
  },

  trail: function() {
    return this.belongsTo('Trail');
  },

  virtuals: {
    themes: {
      get: decodeThemes,
      set: encodeThemes
    },
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

function decodeThemes() {

  const themes = [];
  const bitmask = this.get('themes_and_zones_bitmask');
  _.each(THEMES, (theme, i) => {
    const mask = 1 << (THEMES_START + i);
    if ((bitmask & mask) != 0) {
      themes.push(theme);
    }
  });

  return themes;
}

function encodeThemes(themes) {

  let bitmask = this.get('themes_and_zones_bitmask');
  _.each(THEMES, (theme, i) => {
    const mask = 1 << (THEMES_START + i);
    if (_.includes(themes, theme)) {
      bitmask = bitmask | mask;
    } else if ((bitmask & mask) != 0) {
      bitmask = bitmask ^ mask;
    }
  });

  this.set('themes_and_zones_bitmask', bitmask);
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
