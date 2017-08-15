/* jshint expr: true */
const _ = require('lodash');
const expect = require('../chai').expect;
const responseExpectation = require('../response-expectation');

exports.empty = responseExpectation(function(res, status) {
  expect(res.status, 'res.status').to.equal(status || 204);
  expect(res.body, 'res.body').to.be.empty;
});

exports.json = responseExpectation(function(res, status) {
  expect(res.status, 'res.status').to.equal(status);
  expect(res.get('Content-Type'), 'res.headers["Content-Type"]').to.match(/^application\/json/);
});

exports.unauthorized = responseExpectation(function(res, expectedErrors) {
  expect(res.status, 'res.status').to.equal(401);
  expectErrors(res, expectedErrors);
});

exports.forbidden = responseExpectation(function(res, expectedErrors) {
  expect(res.status, 'res.status').to.equal(403);
  expectErrors(res, expectedErrors);
});

exports.notFound = responseExpectation(function(res, expectedErrors) {
  expect(res.status, 'res.status').to.equal(404);
  expectErrors(res, expectedErrors);
});

exports.invalid = responseExpectation(function(res, expectedErrors) {
  expect(res.status, 'res.status').to.equal(422);
  expectErrors(res, expectedErrors);
});

function expectErrors(res, expectedErrors) {
  expectErrorResponse(res);

  if (_.isArray(expectedErrors)) {
    expect(res.body.errors).to.containErrors(expectedErrors);
  } else {
    expect(res.body.errors, 'res.body.errors').to.have.lengthOf(1);
    expect(res.body.errors[0], 'res.body.errors[0]').to.be.an('object');
    expect(res.body.errors[0], 'res.body.errors[0]').to.eql(expectedErrors);
  }
}

function expectSingleError(res, expectedMessage) {
  expectErrorResponse(res);
}

function expectErrorResponse(res) {
  expect(res.get('Content-Type'), 'res.headers["Content-Type"]').to.match(/^application\/json/);
  expect(res.body, 'res.body').to.be.an('object');
  expect(res.body, 'res.body').to.have.all.keys('errors');
  expect(res.body.errors, 'res.body.errors').to.be.an('array');
}
