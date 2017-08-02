const _ = require('lodash');
const chance = require('../chance');
const generator = require('../generator');
const InstallationEvent = require('../../models/installation-event');
const spec = require('../utils');
const uuid = require('uuid');

exports.event = function(data) {
  data = data || {};
  return spec.createRecord(InstallationEvent, {
    api_id: data.id || exports.id(),
    type: data.type,
    version: data.version,
    installation_id: data.installation ? data.installation.get('id') : data.installationId,
    properties: data.properties || {},
    created_at: data.createdAt,
    occurred_at: data.occurredAt
  });
};

exports.id = generator.unique(function() {
  return uuid.v4();
});
