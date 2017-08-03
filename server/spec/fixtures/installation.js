const _ = require('lodash');
const chance = require('../chance');
const crypto = require('crypto');
const generator = require('../generator');
const Installation = require('../../models/installation');
const spec = require('../utils');
const uuid = require('uuid');

exports.installation = function(data) {
  data = data || {};
  const now = new Date();
  return spec.createRecord(Installation, {
    api_id: data.id || exports.id(),
    shared_secret: data.sharedSecret || crypto.randomBytes(256).toString('hex'),
    properties: data.properties || {},
    events_count: data.eventsCount || 0,
    created_at: data.createdAt || now,
    updated_at: data.updatedAt,
    first_started_at: data.firstStartedAt || data.createdAt || now,
    last_event_at: data.lastEventAt
  });
};

exports.id = generator.unique(function() {
  return uuid.v4();
});
