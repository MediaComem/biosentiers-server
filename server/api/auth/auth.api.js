const _ = require('lodash');
const auth = require('../auth');
const config = require('../../../config');
const errors = require('../errors');
const jwt = require('../../lib/jwt');
const LocalStrategy = require('passport-local').Strategy;
const mailer = require('../../lib/mailer');
const moment = require('moment');
const np = require('../../lib/native-promisify');
const passport = require('passport');
const policy = require('../users/users.policy');
const qs = require('qs');
const route = require('../route');
const User = require('../../models/user');
const validate = require('../validate');
const validations = require('../users/users.validations');

setUpPassport();

// API resource name (used in some API errors).
exports.resourceName = 'auth';

exports.authenticate = function(req, res, next) {
  // TODO: use async route
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('Could not authenticate user'));
    }

    req.currentUser = user;

    res.json({
      token: user.generateJwt({
        exp: moment().add(2, 'weeks').unix()
      }),
      user: policy.serialize(req, user)
    });
  })(req, res, next);
};

exports.createInvitation = route(async function(req, res) {

  const invitation = _.pick(req.body, 'email', 'role', 'firstName', 'lastName');
  await np(validateInvitation(req));

  const createdAt = new Date();

  const token = jwt.generateToken(_.extend({}, invitation, {
    authType: 'invitation',
    iat: moment(createdAt).unix(),
    exp: moment(createdAt).add(2, 'days').unix(),
    iss: req.currentUser.get('api_id')
  }));

  const queryString = qs.stringify({
    invitation: token
  });

  const invitationLink = config.baseUrl + '/register?' + queryString;

  await mailer.send({
    to: invitation.email,
    subject: 'Invitation BioSentiers',
    text: 'Bienvenue sur BioSentiers!\n===========================\n\nVeuillez suivre ce lien pour créer votre compte: ' + invitationLink
  });

  res.status(201).json(_.extend(invitation, {
    createdAt: createdAt
  }));
});

exports.retrieveInvitation = route(async function(req, res) {

  // If a user already exists with the same e-mail, then the invitation
  // has already been used and is no longer valid.
  await new User().whereEmail(req.jwtToken.email).fetch().then(function(user) {
    if (user) {
      throw errors.invalidAuthorizationError();
    }
  });

  // Returns a pseudo-resource containing the invitation's data.
  const invitation = _.extend(_.pick(req.jwtToken, 'email', 'role', 'firstName', 'lastName'), {
    createdAt: new Date(req.jwtToken.iat)
  });

  return res.json(invitation);
});

exports.requestPasswordReset = route(async function(req, res) {
  const validation = await np(validatePasswordReset(req));

  const now = new Date();
  const email = req.body.email;

  const tokenData = {
    email: email,
    authType: 'passwordReset',
    iat: moment(now).unix(),
    exp: moment(now).add(1, 'hour').unix()
  };

  if (req.currentUser) {
    tokenData.iss = req.currentUser.get('api_id');
  }

  const passwordResetUser = validation.getData('passwordResetUser');
  const resetPasswordLink = config.baseUrl + '/resetPassword?' + qs.stringify({
    otp: jwt.generateToken(tokenData)
  });

  await mailer.send({
    to: email,
    subject: 'Changement de mot de passe BioSentiers',
    text: `Bonjour ${passwordResetUser.get('first_name')}\n===========================\n\nVous avez demandé à changer votre mot de passe BioSentiers. Veuillez suivre ce lien pour le faire: ${resetPasswordLink}`
  });

  res.sendStatus(204);
});

exports.retrievePasswordResetRequest = route(async function(req, res) {

  // If a user does not exist with that e-mail, then the request is invalid.
  await new User().whereEmail(req.jwtToken.email).fetch().then(function(user) {
    if (!user) {
      throw errors.invalidAuthorizationError();
    }
  });

  // Returns a pseudo-resource containing the request's data.
  const passwordReset = _.extend(_.pick(req.jwtToken, 'email'), {
    createdAt: new Date(req.jwtToken.iat)
  });

  return res.json(passwordReset);
});

function validateInvitation(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/email'),
        this.type('string'),
        this.required(),
        this.email(),
        validations.emailAvailable()
      ),
      this.validate(
        this.json('/role'),
        this.type('string'),
        this.required(),
        this.inclusion({ in: User.roles })
      )
    );
  });
}

function validatePasswordReset(req) {
  return validate.requestBody(req, function() {
    return this.validate(
      this.json('/email'),
      this.type('string'),
      this.required(),
      this.email(),
      validations.emailExists('passwordResetUser')
    );
  });
}

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
