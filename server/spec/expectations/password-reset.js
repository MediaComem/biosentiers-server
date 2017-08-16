const _ = require('lodash');
const expect = require('../chai').expect;
const expectJwt = require('./jwt');
const expectUser = require('./user');
const spec = require('../utils');

module.exports = spec.enrichExpectation(async (actual, expected) => {

  const keys = [ 'email', 'createdAt' ];
  _.each([ 'link', 'user' ], property => {
    if (expected[property]) {
      keys.push(property);
    }
  });

  expect(actual, 'passwordReset').to.have.all.keys(keys);

  expect(actual.email, 'passwordReset.email').to.equal(expected.email);
  spec.expectTimestamp('passwordReset', actual, expected, 'created');

  if (expected.link) {
    expect(actual.link, 'passwordReset.link').to.startWith(expected.link);
    expectJwt(actual.link.slice(expected.link.length), expected.token);
  } else {
    expect(actual, 'passwordReset.link').not.to.have.property('link');
  }

  if (expected.user) {
    await expectUser(actual.user, expected.user);
  } else {
    expect(actual, 'passwordReset.user').not.to.have.property('user');
  }
});
