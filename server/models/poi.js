const _ = require('lodash');
const Abstract = require('./abstract');
const bookshelf = require('../db');

const proto = Abstract.prototype;

const Poi = Abstract.extend({
  tableName: 'poi',

  apiId: true,

  virtuals: _.merge({
    geom: {
      get: getGeom,
      set: setGeom
    }
  }, proto.virtuals),

  bird: function() {
    return this.mtiParentOf('Bird', 'theme', 'id');
  },

  butterfly: function() {
    return this.mtiParentOf('Butterfly', 'theme', 'id');
  },

  flower: function() {
    return this.mtiParentOf('Flower', 'theme', 'id');
  },

  owner: function() {
    return this.belongsTo('Owner');
  },

  theme: function() {
    return this.belongsTo('Theme');
  },

  tree: function() {
    return this.mtiParentOf('Tree', 'theme', 'id');
  }
});

function getGeom() {
  const theme = this.related('theme').get('name');
  return theme ? this.related(theme).get('geom') : undefined;
}

function setGeom(geom) {
  const theme = this.related('theme').get('name');
  if (theme) {
    return this.related('theme').set('geom', geom);
  }
}

module.exports = bookshelf.model('Poi', Poi);
