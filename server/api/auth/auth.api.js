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
      exp: createdAt.getTime() + (1000 * 60 * 60 * 24 * 2), // 2 days
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
      text: 'Bienvenue sur BioSentiers!\n===========================\n\nVeuillez suivre ce lien pour créer votre compte: ' + invitationLink
    }).return(token);
  }

  function respond(token) {
    res.status(201).json(_.extend(invitation, {
      createdAt: createdAt
    }));
  }
});

exports.retrieveInvitation = builder.route(function(req, res, helper) {

  return checkExistingUser().then(respond);

  /**
   * If a user already exists with the same e-mail, then the invitation
   * has already been used and is no longer valid.
   */
  function checkExistingUser() {
    return new User().whereEmail(req.jwtToken.email).fetch().then(function(user) {
      if (user) {
        throw auth.invalidAuthorizationError();
      }
    });
  }

  /**
   * Returns a pseudo-resource containing the invitation's data.
   */
  function respond() {

    var invitation = _.extend(_.pick(req.jwtToken, 'email', 'role'), {
      createdAt: new Date(req.jwtToken.iat * 1000)
    });

    return res.json(invitation);
  }
});

function setUpPassport() {
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, function(email, password, done) {
    new User().whereEmail(email).fetch().then(function(user) {
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
