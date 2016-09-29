var api = require('../utils'),
    mailer = require('../../lib/mailer'),
    policy = require('./users.policy'),
    User = require('../../models/user');

var builder = api.builder(User, 'users');

// API resource name (used in some API errors).
exports.name = 'user';

exports.create = builder.route(function(req, res, helper) {
  return helper.create(User.parse(req), policy, sendRegistrationEmail);
});

exports.list = builder.route(function(req, res, helper) {
  return res.json([]);
});

exports.retrieve = builder.route(function(req, res, helper) {
  return helper.respond(req.record, policy);
});

exports.update = builder.route(function(req, res, helper) {

  var user = req.record;

  var password = req.body.password;
  if (password) {
    user.set('password', password);
  }

  return user.save().then(helper.serializer(policy)).then(helper.created());
});

exports.fetchRecord = builder.fetcher(exports.name);

function sendRegistrationEmail(user) {
  return mailer.send({
    to: user.get('email'),
    subject: 'Registration',
    text: 'Hello World!'
  });
}
