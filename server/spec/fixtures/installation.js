const _ = require('lodash');
const chance = require('../chance');
const crypto = require('crypto');
const generator = require('../generator');
const Installation = require('../../models/installation');
const spec = require('../utils');
const uuid = require('uuid');

exports.installation = function(data) {
  data = data || {};
  return spec.createRecord(Installation, {
    api_id: data.id || exports.id(),
    shared_secret: data.sharedSecret || crypto.randomBytes(256).toString('hex'),
    properties: data.properties,
    created_at: data.createdAt,
    updated_at: data.updatedAt
  });
};

exports.id = generator.unique(function() {
  return uuid.v4();
});
