var Abstract = require('./abstract'),
    bookshelf = require('../db');

var Excursion = Abstract.extend({
  tableName: 'excursion',

  apiId: true,
  timestamps: true,

  parsing: {
    default: 'planned_at'
  },

  trail: function() {
    return this.belongsTo('Trail')
  }
});

module.exports = bookshelf.model('Excursion', Excursion);
