const _ = require('lodash');
const expect = require('chai').expect;
const expectJwt = require('./jwt');
const spec = require('../utils');

module.exports = spec.enrichExpectation((actual, expected) => {

  const keys = [ 'email', 'role', 'sent', 'createdAt', 'expiresAt' ];
  _.each([ 'firstName', 'lastName', 'link' ], property => {
    if (expected[property]) {
      keys.push(property);
    }
  });

  expect(actual, 'invitation').to.have.all.keys(keys);

  expect(actual.email, 'invitation.email').to.equal(expected.email);
  expect(actual.role, 'invitation.role').to.equal(expected.role);
  expect(actual.sent, 'invitation.sent').to.equal(expected.sent);
  spec.expectTimestamp('invitation', actual, expected, 'created');
  spec.expectTimestamp('invitation', actual, expected, 'expires');

  if (expected.firstName) {
    expect(actual.firstName, 'invitation.firstName').to.equal(expected.firstName);
  } else {
    expect(actual, 'invitation.firstName').not.to.have.property('firstName');
  }

  if (expected.lastName) {
    expect(actual.lastName, 'invitation.lastName').to.equal(expected.lastName);
  } else {
    expect(actual, 'invitation.lastName').not.to.have.property('lastName');
  }

  if (expected.link) {
    expect(actual.link, 'invitation.link').to.startWith(expected.link);
    expectJwt(actual.link.slice(expected.link.length), expected.token);
  } else {
    expect(actual, 'invitation.link').not.to.have.property('link');
  }
});
