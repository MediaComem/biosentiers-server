const _ = require('lodash');
const chai = require('chai');
const moment = require('moment');

chai.use(require('chai-moment'));

chai.use(function(chai, utils) {
  chai.Assertion.addMethod('iso8601', function(comparison, value) {
    if (comparison && value === undefined) {
      value = comparison;
      comparison = 'at';
    }

    const obj = utils.flag(this, 'object');
    new chai.Assertion(obj).to.be.a('string');

    this.assert(moment(obj, moment.ISO_8601).isValid(), 'expected #{this} to be a valid ISO-8601 date string', 'expected #{this} not to be a valid ISO-8601 date string');

    if (comparison == 'at') {
      new chai.Assertion(obj).to.be.sameMoment(value);
    } else if (comparison == 'justAfter') {
      new chai.Assertion(obj).to.be.afterMoment(value);
      new chai.Assertion(obj).to.be.beforeMoment(moment(value).add(2, 'seconds'));
    } else if (comparison == 'justBefore') {
      new chai.Assertion(obj).to.be.beforeMoment(value);
      new chai.Assertion(obj).to.be.afterMoment(moment(value).subtract(2, 'seconds'));
    } else if (comparison) {
      throw new Error('ISO-8601 comparison must be either "at", "justAfter" or "justBefore", got ' + JSON.stringify(comparison));
    }
  });
});

chai.use(function(chai, utils) {
  chai.Assertion.addMethod('containErrors', function(expectedErrors) {

    const obj = utils.flag(this, 'object');
    new chai.Assertion(obj).to.be.an('array');

    const missingErrors = [];
    const remainingErrors = obj.slice();

    _.each(expectedErrors, function(expectedError) {
      const error = _.find(remainingErrors, _.matches(expectedError));
      if (error) {
        remainingErrors.splice(remainingErrors.indexOf(error), 1);
      } else {
        missingErrors.push(expectedError);
      }
    });

    this.assert(_.isEmpty(missingErrors) && _.isEmpty(remainingErrors),
      buildErrorsAssertionMessage(true, missingErrors, remainingErrors),
      buildErrorsAssertionMessage(false, expectedErrors));
  });
});

function buildErrorsAssertionMessage(positive, missingErrors, extraErrors) {

  let message = 'expected errors ' + (positive ? '' : 'not ') + 'to contain the following errors:';

  _.each(missingErrors, function(error) {
    message = message + '\n- ' + JSON.stringify(error);
  });

  if (!positive) {
    return message + '\n\nBut it contains exactly these errors and no others.';
  }

  if (extraErrors.length) {
    message = message + '\n\nThe following extra errors were found:';
    _.each(extraErrors, function(error) {
      message += '\n- ' + JSON.stringify(error);
    });
  }

  return message;
}

module.exports = chai;
