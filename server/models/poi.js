const Abstract = require('./abstract');
const bookshelf = require('../db');

const Poi = Abstract.extend({
  tableName: 'poi',

  virtuals: {
    geom: {
      get: getGeom,
      set: setGeom
    }
  },

  bird: function() {
    return this.belongsTo('Bird', 'id');
  },

  butterfly: function() {
    return this.belongsTo('Butterfly', 'id');
  },

  flower: function() {
    return this.belongsTo('Flower', 'id');
  },

  theme: function() {
    return this.belongsTo('Theme');
  },

  tree: function() {
    return this.belongsTo('Tree', 'id');
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
