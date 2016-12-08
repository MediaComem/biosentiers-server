var _ = require('lodash'),
    api = require('../utils'),
    mailer = require('../../lib/mailer'),
    policy = require('./users.policy'),
    QueryBuilder = require('../query-builder'),
    User = require('../../models/user'),
    validations = require('../users/users.validations');

var builder = api.builder(User, 'users');

// API resource name (used in some API errors).
exports.name = 'user';

exports.create = builder.route(function(req, res, helper) {

  if (req.jwtToken.authType == 'invitation') {
    _.extend(req.body, {
      active: true,
      email: req.jwtToken.email,
      role: req.jwtToken.role
    });
  }

  return validate().then(create);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/active'), this.type('boolean')),
        this.validate(this.json('/email'), this.presence(), this.type('string'), this.email(), validations.emailAvailable()),
        this.validate(this.json('/password'), this.presence(), this.type('string')),
        this.validate(this.json('/role'), this.ifSet(), this.type('string'), this.inclusion({ in: User.roles }))
      );
    });
  }

  function create() {
    return User.transaction(function() {
      var record = User.parse(req);
      return record
        .save()
        .then(helper.serializer(policy))
        .then(helper.created());
    });
  }
});

exports.list = builder.route(function(req, res, helper) {

  return new QueryBuilder(req, res, policy.scope(req))
    .paginate()
    .filter(filterByEmail)
    .sort('email', 'createdAt')
    .fetch()
    .map(helper.serializer(policy))
    .then(helper.ok());

  function filterByEmail(query) {
    if (_.isString(req.query.email)) {
      return query.whereEmail(req.query.email);
    }
  }
});

exports.retrieve = builder.route(function(req, res, helper) {
  return helper.respond(req.record, policy);
});

exports.update = builder.route(function(req, res, helper) {

  var user = req.record;
  return validate().then(update);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/password'), this.ifChanged(), this.type('string'), this.presence())
      );
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
