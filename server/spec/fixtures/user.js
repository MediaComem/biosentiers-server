var _ = require('lodash'),
    generator = require('../generator'),
    spec = require('../utils'),
    User = require('../../models/user');

exports.user = function(data) {
  data = data || {};
  return spec.createRecord(User, {
    email: data.email || exports.email(),
    password: data.password || 'changeme',
    active: _.get(data, 'active', true),
    role: data.role || 'user',
    created_at: data.createdAt,
    updated_at: data.updatedAt
  });
};

exports.admin = function(data) {
  return exports.user(_.extend({}, data, { role: 'admin' }));
};

exports.email = generator(function(i) {
  return 'email-' + i + '@example.com';
});
