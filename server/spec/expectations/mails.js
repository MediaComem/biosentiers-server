const _ = require('lodash');
const config = require('../../../config');
const expect = require('chai').expect;
const mailer = require('../../lib/mailer');

module.exports = function(expected, ...callbacks) {
  if (!_.isArray(expected)) {
    expected = [ expected ];
  }

  expect(mailer.testMails).to.have.lengthOf(expected.length);

  const results = [];
  expected.forEach((exp, i) => {

    const text = exp.text;
    const html = exp.html;
    const token = exp.token;

    const mail = mailer.testMails[i];

    expect(_.omit(mail, 'text', 'html'), 'mail').to.eql(_.omit(exp, 'text', 'html', 'token'));

    const contentKeys = [ 'text' ];
    if (config.mail.html) {
      contentKeys.push('html');
    }

    expect(mail, 'mail').to.include.all.keys(...contentKeys);
    contentKeys.forEach(key => expect(mail[key], `mail.${key}`).to.be.a('string'));

    results.push(callbacks.map(callback => callback(mail, exp)));
  });

  return results;
};

module.exports.none = function(result) {
  return Promise.resolve(module.exports([])).then(() => result);
};
