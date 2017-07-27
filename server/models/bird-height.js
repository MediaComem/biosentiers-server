const Abstract = require('./abstract');
const bookshelf = require('../db');

const BirdHeight = Abstract.extend({
  tableName: 'bird_height'
});

module.exports = bookshelf.model('BirdHeight', BirdHeight);
