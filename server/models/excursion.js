const _ = require('lodash');
const Abstract = require('./abstract');
const bookshelf = require('../db');
const randomString = require('randomstring');

const Excursion = Abstract.extend({
  tableName: 'excursion',

  apiId: generateExcursionApiId,
  hrefBase: '/api/excursions',
  timestamps: true,

  creator: function() {
    return this.belongsTo('User', 'creator_id');
  },

  trail: function() {
    return this.belongsTo('Trail');
  },

  themes: function() {
    return this.belongsToMany('Theme', 'excursions_themes');
  },

  zones: function() {
    return this.belongsToMany('Zone', 'excursions_zones');
  }
});

module.exports = bookshelf.model('Excursion', Excursion);

function generateExcursionApiId() {
  return randomString.generate({ length: 5, charset: 'alphanumeric', capitalization: 'lowercase' });
}
