const _ = require('lodash');
const config = require('../../../config');
const expect = require('../chai').expect;
const jwt = require('jsonwebtoken');
const spec = require('../utils');

module.exports = spec.enrichExpectation(function(actual, expected) {
  expect(actual, 'jwt').to.be.a('string');

  let decoded;
  expect(function() {
    decoded = jwt.verify(actual, config.jwtSecret);
  }).not.to.throw();

  const timestamps = [ 'iat', 'exp' ];
  _.each(timestamps, property => {
    expectUnixTimestamp(decoded[property], expected[property]);
  });

  _.each(_.omit(expected, ...timestamps), (value, key) => {
    expect(decoded[key], `jwt.${key}`).to.equal(expected[key]);
  });

  const keys = _.reduce(expected, (memo,value,key) => value !== undefined && value !== null ? [ ...memo, key ] : memo, []);
  expect(decoded, 'jwt').to.have.all.keys(keys);
});

function expectUnixTimestamp(actual, expected) {
  expect(actual).to.be.a('number');
  expect(actual).to.be.gte(expected - 1);
  expect(actual).to.be.lte(expected + 1);
}
