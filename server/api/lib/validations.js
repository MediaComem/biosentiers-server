const _ = require('lodash');
const moment = require('moment');

exports.array = function(min, max, options) {
  if (_.isPlainObject(min)) {
    options = min;
  } else {
    options = _.extend({}, options, {
      min: min,
      max: max
    });
  }

  if (options.min !== undefined && !_.isNumber(min)) {
    throw new Error(`Array validator "min" option must be a number, got ${typeof(options.min)}`);
  } else if (options.max !== undefined && !_.isNumber(max)) {
    throw new Error(`Array validator "max" option must be a number, got ${typeof(options.max)}`);
  }

  let validation;
  if (options.min !== undefined && options.max !== undefined) {
    validation = 'between';
  } else if (options.min !== undefined) {
    validation = 'atLeast';
  } else {
    validation = 'atMost';
  }

  return function(context) {

    const value = context.get('value');

    let cause;
    if (!_.isArray(value)) {
      cause = 'wrongType';
    } else if (options.min !== undefined && value.length < options.min) {
      cause = 'tooFew';
    } else if (options.max !== undefined && value.length > options.max) {
      cause = 'tooMany';
    }

    if (cause) {
      context.addError({
        validator: 'array',
        validation: validation,
        min: min,
        max: max,
        actual: _.isArray(value) ? value.length : undefined,
        cause: cause
      });
    }
  };
};

exports.iso8601 = function() {
  return function(context) {
    const value = context.get('value');
    if (typeof(value) != 'string' || !moment(value, moment.ISO_8601).isValid()) {
      context.addError({
        validator: 'iso8601',
        message: 'is not a valid ISO-8601 date'
      });
    }
  };
};

exports.equals = function(value) {
  return function(context) {
    if (context.get('value') !== value) {
      context.addError({
        validator: 'equals',
        message: `must be ${JSON.stringify(value)}`
      });
    }
  };
};
