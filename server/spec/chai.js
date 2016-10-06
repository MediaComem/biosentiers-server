var _ = require('lodash'),
    chai = require('chai'),
    moment = require('moment');

chai.use(require('chai-moment'));

chai.use(function(chai, utils) {
  chai.Assertion.addMethod('iso8601', function(comparison, value) {
    if (comparison && value === undefined) {
      value = comparison;
      comparison = 'at';
    }

    var obj = utils.flag(this, 'object');
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

module.exports = chai;
