const _ = require('lodash');
const BPromise = require('bluebird');
const valdsl = require('valdsl');

const custom = valdsl();

custom.override('createError', function(original) {
  return function(...args) {
    const error = original.call(this, ...args);
    delete error.data;
    return error;
  };
});

module.exports = custom;
