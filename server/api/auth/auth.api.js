var _ = require('lodash'),
    api = require('../utils'),
    auth = require('../auth'),
    config = require('../../../config'),
    errors = require('../errors'),
    jwt = require('../../lib/jwt'),
    LocalStrategy = require('passport-local').Strategy,
    mailer = require('../../lib/mailer'),
    passport = require('passport'),
    policy = require('../users/users.policy'),
    qs = require('qs'),
    User = require('../../models/user'),
    validations = require('../users/users.validations');

setUpPassport();

var builder = api.builder(User, 'api');

// API resource name (used in some API errors).
exports.name = 'auth';

exports.authenticate = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('Could not authenticate user'));
    }

    req.user = user;

    res.json({
      token: user.generateJwt(),
      user: policy.serialize(user, req)
    });
  })(req, res, next);
};

exports.createInvitation = builder.route(function(req, res, helper) {

  var createdAt,
      invitation = _.pick(req.body, 'email', 'role');

  return validate()
    .then(generateInvitationToken)
    .then(sendInvitationEmail)
    .then(respond);

  function validate() {
    return helper.validateRequestBody(function() {
      return this.parallel(
        this.validate(this.json('/email'), this.type('string'), this.presence(), this.email(), validations.emailAvailable()),
        this.validate(this.json('/role'), this.type('string'), this.presence(), this.inclusion({ in: User.roles }))
      );
    });
  }

  function generateInvitationToken() {

    createdAt = new Date();

    return jwt.generateToken(_.extend({}, invitation, {
      authType: 'invitation',
      iat: createdAt.getTime(),
      iss: req.user.get('api_id')
    }));
  }

  function sendInvitationEmail(token) {

    var queryString = qs.stringify({
      invitation: token
    });

    var invitationLink = config.url + '/register?' + queryString;

    return mailer.send({
      to: invitation.email,
      subject: 'Invitation BioSentiers',
      text: 'Bienvenue dans BioSentiers!\n===========================\n\nVeuillez suivre ce lien pour créer votre compte: ' + invitationLink
    }).return(token);
  }

  function respond(token) {
    res.status(201).json(_.extend(invitation, {
      createdAt: createdAt
    }));
  }
});

function setUpPassport() {
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, function(email, password, done) {
    User.where({
      email: email.toLowerCase()
    }).fetch().then(function(user) {
      if (!user || !user.isActive()) {
        throw errors.unauthorized('auth.invalidUser', 'This user account does not exist or is inactive.');
      } else if (!user.hasPassword(password)) {
        throw errors.unauthorized('auth.invalidCredentials', 'The e-mail or password is invalid.');
      } else {
        done(undefined, user);
      }
    }).catch(done);
  }));
}
