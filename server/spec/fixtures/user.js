const _ = require('lodash'),
const generator = require('../generator');
const spec = require('../utils');
const User = require('../../models/user');

exports.user = function(data) {
  data = data || {};
  return spec.createRecord(User, {
    email: data.email || exports.email(),
    password: data.password,
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
