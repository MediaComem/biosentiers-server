const Abstract = require('./abstract');
const bookshelf = require('../db');

const Zone = Abstract.extend({
  tableName: 'zone',

  excursions: function() {
    return this.belongsToMany('Excursion', 'excursions_zones');
  }
});

module.exports = bookshelf.model('Zone', Zone);
