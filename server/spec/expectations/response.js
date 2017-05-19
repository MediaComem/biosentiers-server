/* jshint expr: true */
const expect = require('../chai').expect;
const spec = require('../utils');

exports.empty = spec.responseExpectationFactory(function(res, status) {
  expect(res.status, 'res.status').to.equal(status || 204);
  expect(res.body, 'res.body').to.be.empty;
});

exports.json = spec.responseExpectationFactory(function(res, status) {
  expect(res.status, 'res.status').to.equal(status);
  expect(res.get('Content-Type'), 'res.headers["Content-Type"]').to.match(/^application\/json/);
});

exports.unauthorized = spec.responseExpectationFactory(function(res, expectedMessage) {
  expect(res.status, 'res.status').to.equal(401);
  expectSingleError(res, expectedMessage);
});

exports.forbidden = spec.responseExpectationFactory(function(res, expectedMessage) {
  expect(res.status, 'res.status').to.equal(403);
  expectSingleError(res, expectedMessage);
});

exports.notFound = spec.responseExpectationFactory(function(res, expectedMessage) {
  expect(res.status, 'res.status').to.equal(404);
  expectSingleError(res, expectedMessage);
});

exports.invalid = spec.responseExpectationFactory(function(res, expectedErrors) {
  expect(res.status, 'res.status').to.equal(422);
  expectErrors(res, expectedErrors);
});

function expectSingleError(res, expectedMessage) {
  expectErrorResponse(res);
  expect(res.body.errors, 'res.body.errors').to.have.lengthOf(1);
  expect(res.body.errors[0], 'res.body.errors[0]').to.be.an('object');
  expect(res.body.errors[0].message, 'res.body.errors[0].message').to.equal(expectedMessage);
}

function expectErrors(res, expectedErrors) {
  expectErrorResponse(res);
  expect(res.body.errors).to.containErrors(expectedErrors);
}

function expectErrorResponse(res) {
  expect(res.get('Content-Type'), 'res.headers["Content-Type"]').to.match(/^application\/json/);
  expect(res.body, 'res.body').to.be.an('object');
  expect(res.body, 'res.body').to.have.all.keys('errors');
  expect(res.body.errors, 'res.body.errors').to.be.an('array');
}
