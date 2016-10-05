var expect = require('chai').expect,
    spec = require('../utils');

module.exports = spec.createExpectation(function(actual, expected) {

  expect(actual).to.be.an('object');

  var keys = [ 'id', 'email', 'active', 'role', 'createdAt', 'updatedAt' ];
  expect(actual, 'user').to.have.all.keys(keys);

  expect(actual.id, 'user.id').to.be.a('string');
  expect(actual.email, 'user.email').to.equal(expected.email);
});
