const _ = require('lodash');
const chai = require('chai');
const moment = require('moment');

const timestampComparisons = [ 'at', 'gt', 'gte', 'lt', 'lte', 'justAfter', 'justBefore' ];

chai.use(require('chai-moment'));
chai.use(require('chai-string'));

chai.use(function(chai, utils) {
  chai.Assertion.addMethod('iso8601', function(comparison, value) {
    if (comparison && !_.includes(timestampComparisons, comparison) && value === undefined) {
      value = comparison;
      comparison = 'at';
    }

    const obj = utils.flag(this, 'object');
    new chai.Assertion(obj, `expected ${value} to be a valid ISO-8601 date string`).to.be.a('string');

    const actualDate = moment(obj, moment.ISO_8601);
    this.assert(actualDate.isValid(), 'expected #{this} to be a valid ISO-8601 date string', 'expected #{this} not to be a valid ISO-8601 date string');

    const expectedDate = moment(value, moment.ISO_8601);
    if (!expectedDate.isValid()) {
      throw new Error(`Expected date "${value}" is not a valid ISO-8601 string`);
    }

    if (comparison == 'at') {
      const message = `expected ${actualDate.format()} to be ${expectedDate.format()}`;
      new chai.Assertion(actualDate.valueOf(), message).to.equal(expectedDate.valueOf());
    } else if (comparison == 'gt') {
      const message = `expected ${actualDate.format()} to be greater than ${expectedDate.format()}`;
      new chai.Assertion(actualDate.valueOf(), message).to.be.gt(expectedDate.valueOf());
    } else if (comparison == 'gte') {
      const message = `expected ${actualDate.format()} to be greater than or equal to ${expectedDate.format()}`;
      new chai.Assertion(actualDate.valueOf(), message).to.be.gte(expectedDate.valueOf());
    } else if (comparison == 'lt') {
      const message = `expected ${actualDate.format()} to be less than ${expectedDate.format()}`;
      new chai.Assertion(actualDate.valueOf(), message).to.be.lt(expectedDate.valueOf());
    } else if (comparison == 'lte') {
      const message = `expected ${actualDate.format()} to be less than or equal to ${expectedDate.format()}`;
      new chai.Assertion(actualDate.valueOf(), message).to.be.lte(expectedDate.valueOf());
    } else if (comparison == 'justAfter') {
      const message = `expected ${actualDate.format()} to be after ${expectedDate.format()} and before ${moment(expectedDate).add(2, 'seconds').format()}`;
      new chai.Assertion(actualDate.valueOf(), message).to.be.gt(expectedDate.valueOf());
      new chai.Assertion(actualDate.valueOf(), message).to.be.lt(moment(expectedDate).add(2, 'seconds').valueOf());
    } else if (comparison == 'justBefore') {
      const message = `expected ${actualDate.format()} to be after ${moment(expectedDate).subtract(2, 'seconds').format()} and before ${expectedDate.format()}`;
      new chai.Assertion(actualDate.valueOf()).to.be.lt(expectedDate.valueOf());
      new chai.Assertion(actualDate.valueOf()).to.be.gt(moment(expectedDate).subtract(2, 'seconds').valueOf());
    } else if (comparison) {
      const descriptions = timestampComparisons.map(comparison => `"${comparison}"`).join(', ');
      throw new Error(`ISO-8601 comparison must be one of ${descriptions}, got ${JSON.stringify(comparison)}`);
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
      const error = _.find(remainingErrors, error => _.isEqual(error, expectedError));
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
