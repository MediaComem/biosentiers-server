const _ = require('lodash');
const BPromise = require('bluebird');
const config = require('../../config');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const logger = config.logger('mailer');
const transporter = createTransport();

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

  const start = new Date().getTime();

  const email = {
    from: '"' + config.mail.fromName + '" <' + config.mail.fromAddress + '>',
    to: options.to,
    subject: options.subject,
    text: options.text
  };

  if (config.mail.html) {
    email.html = options.html;
  }

  return sendEmail(email).tap(function() {
    const duration = (new Date().getTime() - start) / 1000;
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
    return BPromise.resolve();
  } else if (config.env == 'test') {
    throw new Error('Trying to send an e-mail in test mode');
  }

  return new BPromise(function(resolve, reject) {
    transporter.sendMail(email, function(err, info) {
      return err ? reject(err) : resolve();
    });
  });
}
