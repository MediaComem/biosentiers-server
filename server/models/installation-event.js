const Abstract = require('./abstract');
const bookshelf = require('../db');

const proto = Abstract.prototype;

const InstallationEvent = Abstract.extend({
  tableName: 'installation_event',

  apiId: true,
  hrefBase: '/api/installation-events',
  timestamps: 'created_at',

  installation: function() {
    return this.belongsTo('Installation');
  },

  updateProperties: function(properties) {
    return this.updateDynamicProperties('properties', properties);
  }
});

module.exports = bookshelf.model('InstallationEvent', InstallationEvent);
