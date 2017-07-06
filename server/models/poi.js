const Abstract = require('./abstract');
const bookshelf = require('../db');

const Poi = Abstract.extend({
  tableName: 'poi',

  theme: function() {
    return this.belongsTo('Theme');
  }
});

module.exports = bookshelf.model('Poi', Poi);
