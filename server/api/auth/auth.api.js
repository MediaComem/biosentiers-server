const _ = require('lodash');
const api = require('../utils');
const auth = require('../auth');
const config = require('../../../config');
const errors = require('../errors');
const jwt = require('../../lib/jwt');
const LocalStrategy = require('passport-local').Strategy;
const mailer = require('../../lib/mailer');
const passport = require('passport');
const policy = require('../users/users.policy');
const qs = require('qs');
const User = require('../../models/user');
const validations = require('../users/users.validations');

setUpPassport();

const builder = api.builder(User, 'api');

// API resource name (used in some API errors).
exports.name = 'auth';

exports.authenticate = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('Could not authenticate user'));
    }

    res.json({
      token: user.generateJwt(),
      user: policy.serialize(user, req)
    });
  })(req, res, next);
};

exports.createInvitation = builder.route(function(req, res, helper) {

  let createdAt;
  const invitation = _.pick(req.body, 'email', 'role', 'firstName', 'lastName');

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
      iss: req.currentUser.get('api_id')
    }));
  }

  function sendInvitationEmail(token) {

    const queryString = qs.stringify({
      invitation: token
    });

    const invitationLink = config.url + '/register?' + queryString;

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
        throw errors.invalidAuthorizationError();
      }
    });
  }

  /**
   * Returns a pseudo-resource containing the invitation's data.
   */
  function respond() {

    const invitation = _.extend(_.pick(req.jwtToken, 'email', 'role', 'firstName', 'lastName'), {
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
