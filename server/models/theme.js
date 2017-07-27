const Abstract = require('./abstract');
const bookshelf = require('../db');

const NAMES = Object.freeze([ 'bird', 'butterfly', 'flower', 'tree' ]);

const Theme = Abstract.extend({
  tableName: 'theme',

  excursions: function() {
    return this.belongsToMany('Excursion', 'excursions_themes');
  }
}, {
  names: NAMES
});

module.exports = bookshelf.model('Theme', Theme);
