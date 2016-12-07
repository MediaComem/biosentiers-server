var Abstract = require('./abstract'),
    bookshelf = require('../db');

var proto = Abstract.prototype;

var Excursion = Abstract.extend({
  tableName: 'excursion',

  apiId: true,
  timestamps: true,

  parsing: {
    default: 'trail planned_at'
  },

  virtuals: {
    trail: {
      get: function() {
        return this.related('trail');
      },

      set: function(trail) {
        this.relations.trail = trail;
        this.set('trail_id', trail.get('id'));
      }
    }
  },

  trail: function() {
    return this.belongsTo('Trail');
  }
});

module.exports = bookshelf.model('Excursion', Excursion);
