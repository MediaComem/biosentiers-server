const Abstract = require('./abstract');
const bookshelf = require('../db');

const Theme = Abstract.extend({
  tableName: 'theme',

  excursions: function() {
    return this.belongsToMany('Excursion', 'excursions_themes');
  }
});

module.exports = bookshelf.model('Theme', Theme);
