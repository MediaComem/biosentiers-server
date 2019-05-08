const _ = require('lodash');
const chance = require('chance').Chance();
const generator = require('../generator');
const spec = require('../utils');
const User = require('../../models/user');

exports.user = function(data) {
  data = data || {};

  const firstName = data.firstName || exports.firstName();
  const lastName = data.lastName || exports.lastName();

  return spec.createRecord(User, {
    first_name: firstName,
    last_name: lastName,
    email: data.email || exports.email(firstName, lastName),
    password: data.password || exports.password(),
    active: _.get(data, 'active', true),
    role: data.role || 'user',
    created_at: data.createdAt,
    updated_at: data.updatedAt
  });
};

exports.admin = function(data) {
  return exports.user(_.extend({}, data, { role: 'admin' }));
};

exports.firstName = generator.unique(function() {
  return chance.first().substring(0, 20);
});

exports.lastName = generator.unique(function() {
  return chance.last().substring(0, 20);
});

exports.email = generator.unique(function(firstName, lastName) {
  if (firstName && lastName) {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`.replace(/\s+/g, '-');
  } else {
    return `${chance.word()}@example.com`;
  }
});

exports.password = generator.unique(function() {
  return chance.string();
});
