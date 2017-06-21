const _ = require('lodash');
const bcrypt = require('bcryptjs');
const expect = require('../chai').expect;
const moment = require('moment');
const spec = require('../utils');
const User = require('../../models/user');

module.exports = spec.enrichExpectation(function(actual, expected) {

  // Check the actual object.
  expect(actual, 'user').to.be.an('object');

  const keys = [ 'id', 'firstName', 'lastName', 'email', 'active', 'role', 'createdAt', 'updatedAt' ];
  expect(actual, 'res.body').to.have.all.keys(keys);

  expect(actual.id, 'user.id').to.be.a('string');
  expect(actual.firstName, 'user.firstName').to.equal(expected.firstName);
  expect(actual.lastName, 'user.lastName').to.equal(expected.lastName);
  expect(actual.email, 'user.email').to.equal(expected.email);
  expect(actual.active, 'user.active').to.equal(_.get(expected, 'active', true));
  expect(actual.role, 'user.role').to.equal(_.get(expected, 'role', 'user'));

  spec.expectTimestamp('user', actual, expected, 'created');
  spec.expectTimestamp('user', actual, expected, 'updated');

  // Check that the corresponding user exists in the database.
  return module.exports.inDb(actual.id, _.extend({}, actual, _.pick(expected, 'password')));
});

module.exports.inDb = function(apiId, expected) {
  return new User({ api_id: apiId }).fetch().then(function(user) {
    expect(user, 'db.user').to.be.an.instanceof(User);
    expect(user.get('id'), 'db.user.id').to.be.a('string');
    expect(user.get('api_id'), 'db.user.api_id').to.equal(expected.id);
    expect(user.get('first_name'), 'db.user.first_name').to.equal(expected.firstName);
    expect(user.get('last_name'), 'db.user.last_name').to.equal(expected.lastName);
    expect(user.get('email'), 'db.user.email').to.equal(expected.email);
    expect(user.get('active'), 'db.user.active').to.equal(expected.active);
    expect(user.get('role'), 'db.user.role').to.equal(expected.role);
    expect(user.get('created_at'), 'db.user.created_at').to.be.sameMoment(expected.createdAt);
    expect(user.get('updated_at'), 'db.user.updated_at').to.be.sameMoment(expected.updatedAt);

    if (expected.password) {
      expect(bcrypt.compareSync(expected.password, user.get('password_hash')), 'db.user.password_hash').to.equal(true);
      expect(user.hasPassword(expected.password), 'db.user.password_hash').to.equal(true);
    }
  });
};
