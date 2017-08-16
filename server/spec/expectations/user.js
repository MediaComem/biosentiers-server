const _ = require('lodash');
const bcrypt = require('bcryptjs');
const expect = require('../chai').expect;
const spec = require('../utils');
const User = require('../../models/user');

module.exports = spec.enrichExpectation(function(actual, expected) {

  // Check the actual object.
  expect(actual, 'user').to.be.an('object');

  const keys = [ 'id', 'href', 'firstName', 'lastName', 'email', 'active', 'role', 'createdAt', 'updatedAt' ];
  _.each([ 'loginCount' ], attr => {
    if (expected[attr] !== undefined) {
      keys.push(attr);
    }
  });

  _.each([ 'lastLogin' ], attr => {
    if (spec.hasExpectedTimestamp(expected, attr)) {
      keys.push(`${attr}At`);
    }
  });

  // As the "lastActiveAt" property is saved asynchronously without waiting for request completion,
  // it is difficult to predict its value, hence why it is handled separately here.
  //
  // The property will be assumed to be in the response only if an exact "lastActiveAt" expectation
  // is given. Otherwise it may or may not be there.
  if (expected.lastActiveAt || actual.lastActiveAt) {
    keys.push('lastActiveAt');
  }

  expect(actual, 'res.body').to.have.all.keys(keys);

  expect(actual.id, 'user.id').to.be.a('string');
  if (expected.id) {
    expect(actual.id, 'user.id').to.equal(expected.id);
  }

  expect(actual.href, 'user.href').to.equal(expected.href || `/api/users/${actual.id}`);
  expect(actual.firstName, 'user.firstName').to.equal(expected.firstName);
  expect(actual.lastName, 'user.lastName').to.equal(expected.lastName);
  expect(actual.email, 'user.email').to.equal(expected.email);
  expect(actual.active, 'user.active').to.equal(_.get(expected, 'active', true));
  expect(actual.role, 'user.role').to.equal(_.get(expected, 'role', 'user'));
  expect(actual.loginCount, 'user.loginCount').to.equal(expected.loginCount);

  spec.expectTimestamp('user', actual, expected, 'created');
  spec.expectTimestamp('user', actual, expected, 'updated');
  spec.expectTimestamp('user', actual, expected, 'lastLogin', { required: false });

  if (!spec.hasExpectedTimestamp(expected, 'lastActive')) {
    // If there is no "lastActive" expectation, ensure that "lastActiveAt" is not present.
    expect(actual, 'user.lastActiveAt').not.to.have.property('lastActiveAt');
  } else if (expected.lastActiveAt || actual.lastActiveAt) {
    // Otherwise, check "lastActiveAt" only if there is an exact "lastActiveAt" expectation
    // or if it is present. Otherwise, ignore it if it is missing.
    spec.expectTimestamp('user', actual, expected, 'lastActive');
  }

  // Check that the corresponding user exists in the database.
  return module.exports.db(_.extend({}, actual, _.pick(expected, 'password', 'passwordResetCount')));
});

module.exports.db = async function(expected) {

  const user = await spec.checkRecord(User, expected);
  expect(user, 'db.user').to.be.an.instanceof(User);

  expect(user.get('id'), 'db.user.id').to.be.a('string');
  expect(user.get('api_id'), 'db.user.api_id').to.equal(expected.id);
  expect(user.get('first_name'), 'db.user.first_name').to.equal(expected.firstName);
  expect(user.get('last_name'), 'db.user.last_name').to.equal(expected.lastName);
  expect(user.get('email'), 'db.user.email').to.equal(expected.email);
  expect(user.get('active'), 'db.user.active').to.equal(expected.active);
  expect(user.get('role'), 'db.user.role').to.equal(expected.role);
  expect(user.get('password_reset_count'), 'db.user.password_reset_count').to.equal(expected.passwordResetCount || 0);
  expect(user.get('created_at'), 'db.user.created_at').to.be.sameMoment(expected.createdAt);
  expect(user.get('updated_at'), 'db.user.updated_at').to.be.sameMoment(expected.updatedAt);

  if (expected.password) {
    expect(bcrypt.compareSync(expected.password, user.get('password_hash')), 'db.user.password_hash').to.equal(true);
    expect(user.hasPassword(expected.password), 'db.user.password_hash').to.equal(true);
  }
};
