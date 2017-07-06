const Abstract = require('./abstract');
const bookshelf = require('../db');

const Trail = Abstract.extend({
  tableName: 'trail',

  apiId: true,
  timestamps: true,

  parsing: {
    default: 'name'
  },

  zones: function() {
    return this.belongsToMany('Zone', 'trails_zones').withPivot([ 'position' ]);
  }
});

module.exports = bookshelf.model('Trail', Trail);
