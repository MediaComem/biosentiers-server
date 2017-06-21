const _ = require('lodash');
const chance = require('chance').Chance();
const generator = require('../generator');
const spec = require('../utils');
const User = require('../../models/user');

exports.user = function(data) {
  data = data || {};

  const fullName = exports.fullName();
  if (!fullName.match(/^\w+\s+\w+$/)) {
    throw new Error(`Expected random name "${fullName}" to contain a first and last name`);
  }

  const firstName = data.firstName || fullName.replace(/ .*/, '');
  const lastName = data.lastName || fullName.replace(/^[^ ]+ /, '');

  return spec.createRecord(User, {
    first_name: firstName,
    last_name: lastName,
    email: data.email || exports.email(firstName, lastName),
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

exports.email = generator.unique(function(firstName, lastName) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
});

exports.fullName = generator.unique(function() {
  return chance.name();
});
