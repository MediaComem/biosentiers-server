var _ = require('lodash'),
    api = require('../utils'),
    mailer = require('../../lib/mailer'),
    policy = require('./users.policy'),
    User = require('../../models/user');

var builder = api.builder(User, 'users');

// API resource name (used in some API errors).
exports.name = 'user';

exports.create = builder.route(function(req, res, helper) {
  return validate().then(create);

  function validate() {
    return helper.validateRequest(function() {
      return this.validate(this.get('body'), this.type('object'), function() {
        return this.validate(this.json('/email'), this.type('string'), this.presence(), this.email());
      });
    });
  }

  function create() {
    return User.transaction(function() {
      var record = User.parse(req);
      return record
        .save()
        .then(sendRegistrationEmail)
        .return(record)
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

exports.list = builder.route(function(req, res, helper) {
  return res.json([]);
});

exports.retrieve = builder.route(function(req, res, helper) {
  return helper.respond(req.record, policy);
});

exports.update = builder.route(function(req, res, helper) {

  var user = req.record;
  return validate().then(update);

  function validate() {
    return helper.validateRequest(function() {
      return this.validate(this.get('body'), this.type('object'), function(context) {
        return this.parallel(
          this.validate(this.json('/password'), this.type('string'), this.presence())
        );
      });
    });
  }

  function update() {
    helper.unserializeTo(user, [ 'active', 'email', 'role' ]);

    var password = req.body.password,
        previousPassword = req.body.previousPassword;
    if (user.get('password_hash') && password && user.hasPassword(previousPassword)) {
      user.set('password', password);
    } else if (!user.get('password_hash') && password) {
      user.set('password', password);
    }

    return user
      .save()
      .then(helper.serializer(policy))
      .then(helper.ok());
  }
});

exports.fetchRecord = builder.fetcher(exports.name);

function sendRegistrationEmail(user) {
  return mailer.send({
    to: user.get('email'),
    subject: 'Registration',
    text: 'Hello World!'
  });
}
