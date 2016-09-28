var api = require('../utils'),
    mailer = require('../../lib/mailer'),
    policy = require('./users.policy'),
    User = require('../../models/user');

var builder = api.builder(User, 'users');

// API resource name (used in some API errors).
exports.name = 'user';

exports.create = builder.route(function(req, res, next, helper) {
  helper.create(User.parse(req), policy, sendRegistrationEmail).catch(next);
});

exports.list = builder.route(function(req, res, next, helper) {
  res.json([]);
});

exports.retrieve = builder.route(function(req, res, next, helper) {
  helper.respond(req.record, policy);
});

exports.update = builder.route(function(req, res, next, helper) {

  var user = req.record;

  var password = req.body.password;
  if (password) {
    user.set('password', password);
  }

  user.save().then(helper.serializer(policy)).then(helper.created());
});

exports.fetchRecord = builder.fetcher(exports.name);

function sendRegistrationEmail(user) {
  return mailer.send({
    to: user.get('email'),
    subject: 'Registration',
    text: 'Hello World!'
  });
}
