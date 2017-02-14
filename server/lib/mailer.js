var _ = require('lodash'),
    config = require('../../config'),
    nodemailer = require('nodemailer'),
    Promise = require('bluebird'),
    smtpTransport = require('nodemailer-smtp-transport');

var logger = config.logger('mailer'),
    transporter = createTransport();

exports.send = function(options) {
  if (!_.isObject(options)) {
    throw new Error('Mail options must be an object');
  } else if (!options.to) {
    throw new Error('Mail `to` option is required');
  } else if (!options.subject) {
    throw new Error('Mail `subject` option is required');
  } else if (!options.text) {
    throw new Error('Mail `text` option is required');
  }

  var start = new Date().getTime();

  var email = {
    from: '"' + config.mail.fromName + '" <' + config.mail.fromAddress + '>',
    to: options.to,
    subject: options.subject,
    text: options.text
  };

  return sendEmail(email).tap(function() {
    var duration = (new Date().getTime() - start) / 1000;
    logger.info('E-mail "' + email.subject + '" sent to ' + email.to + ' in ' + duration + 's');
  });
};

function createTransport() {
  return nodemailer.createTransport(smtpTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.username,
      pass: config.mail.password
    }
  }));
}

function sendEmail(email) {
  if (!config.mail.enabled) {
    return Promise.resolve();
  } else if (config.env == 'test') {
    throw new Error('Trying to send an e-mail in test mode');
  }

  return new Promise(function(resolve, reject) {
    transporter.sendMail(email, function(err, info) {
      return err ? reject(err) : resolve();
    });
  });
}
