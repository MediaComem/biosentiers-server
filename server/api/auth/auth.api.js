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
const policy = require('./auth.policy');
const qs = require('qs');
const route = require('../route');
const serialize = require('../serialize');
const User = require('../../models/user');
const usersPolicy = require('../users/users.policy');
const validate = require('../validate');
const validations = require('../users/users.validations');

setUpPassport();

const logger = config.logger('api:auth');

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

    // Save asynchronously, no need to wait
    req.currentUser.saveNewLogin().catch(err => logger.warn('Coult not save new user login', err));

    res.json({
      token: user.generateJwt({
        exp: moment().add(2, 'weeks').unix()
      }),
      user: usersPolicy.serialize(req, user)
    });
  })(req, res, next);
};

exports.createInvitation = route(async function(req, res) {
  const invitationLink = await createInvitationLink(req);

  if (invitationLink.sent) {
    await mailer.send({
      to: invitationLink.email,
      subject: 'Invitation BioSentiers',
      text: `Bienvenue sur BioSentiers!\n===========================\n\nVeuillez suivre ce lien pour créer votre compte: ${invitationLink.link}`
    });
  }

  res.status(201).json(await serialize(req, invitationLink, policy.serializeInvitationLink));
});

exports.retrieveInvitation = route(async function(req, res) {

  // If a user already exists with the same e-mail, then the invitation
  // has already been used and is no longer valid.
  await new User().whereEmail(req.jwtToken.email).fetch().then(function(user) {
    if (user) {
      throw errors.invalidAuthorization();
    }
  });

  // Returns a pseudo-resource containing the invitation's data.
  const invitation = _.extend(_.pick(req.jwtToken, 'email', 'role', 'firstName', 'lastName'), {
    createdAt: new Date(req.jwtToken.iat)
  });

  return res.json([ invitation ]);
});

exports.requestPasswordReset = route.transactional(async function(req, res) {
  const resetPasswordLink = await createPasswordResetLink(req);
  const userFirstName = resetPasswordLink.user.get('first_name');

  if (!req.currentUser) {
    await mailer.send({
      to: resetPasswordLink.email,
      subject: 'Changement de mot de passe BioSentiers',
      text: `Bonjour ${userFirstName}\n===========================\n\nVous avez demandé à changer votre mot de passe BioSentiers. Veuillez suivre ce lien pour le faire: ${resetPasswordLink.link}`
    });
  }

  res.status(201).send(await serialize(req, resetPasswordLink, policy.serializePasswordResetLink));
});

exports.retrievePasswordResetRequest = route(async function(req, res) {

  // If a user does not exist with that e-mail, then the request is invalid.
  await new User().whereEmail(req.jwtToken.email).fetch().then(function(user) {
    if (!user) {
      throw errors.invalidAuthorization();
    }

    // If the password reset count in the token is not the same as the user's,
    // it means that this is an old token or that it was already used.
    const passwordResetCount = user.get('password_reset_count');
    if (!_.isNumber(passwordResetCount) || req.jwtToken.passwordResetCount !== passwordResetCount) {
      throw errors.invalidAuthorization();
    }
  });

  // Returns a pseudo-resource containing the request's data.
  const passwordReset = _.extend(_.pick(req.jwtToken, 'email'), {
    createdAt: new Date(req.jwtToken.iat)
  });

  return res.json([ passwordReset ]);
});

async function createInvitationLink(req) {
  await np(validateInvitation(req));

  const createdAt = moment();
  const expiresAt = moment(createdAt).add(2, 'days');
  const invitation = _.pick(req.body, 'email', 'role', 'firstName', 'lastName');
  const sent = req.body.sent;

  const token = jwt.generateToken(_.extend({}, invitation, {
    authType: 'invitation',
    iat: createdAt.unix(),
    exp: expiresAt.unix(),
    iss: req.currentUser.get('api_id')
  }));

  const queryString = qs.stringify({
    invitation: token
  });

  return _.extend({}, invitation, {
    createdAt: createdAt.toDate(),
    expiresAt: expiresAt.toDate(),
    link: `${config.baseUrl}/register?${queryString}`,
    sent: sent
  });
}

async function createPasswordResetLink(req) {
  const validation = await np(validatePasswordReset(req));

  const now = new Date();
  const email = req.body.email;

  const passwordResetUser = validation.getData('passwordResetUser');

  // The password reset count (a number associated with the user)
  // is sent in the JWT token and will be incremented when the token
  // is used. This makes sures it can only be used once.
  const passwordResetCount = passwordResetUser.get('password_reset_count');
  if (!_.isNumber(passwordResetCount) || passwordResetCount < 0) {
    throw new Error(`Unexpected password reset count ${passwordResetCount} (should have been 0 or more)`);
  }

  // Increment the password reset count once to make sure all
  // previous password request tokens are invalid.
  await passwordResetUser.incrementPasswordResetCount();

  const tokenData = {
    email: email,
    authType: 'passwordReset',
    passwordResetCount: passwordResetCount + 1,
    iat: moment(now).unix(),
    exp: moment(now).add(1, 'hour').unix()
  };

  if (req.currentUser) {
    tokenData.iss = req.currentUser.get('api_id');
  }

  const queryString = qs.stringify({
    otp: jwt.generateToken(tokenData)
  });

  return {
    createdAt: now,
    email: email,
    user: passwordResetUser,
    link: `${config.baseUrl}/resetPassword?${queryString}`
  };
}

function validateInvitation(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/email'),
        this.required(),
        this.type('string'),
        this.email(),
        validations.emailAvailable()
      ),
      this.validate(
        this.json('/role'),
        this.required(),
        this.type('string'),
        this.inclusion({ in: User.roles })
      ),
      this.validate(
        this.json('/sent'),
        this.required(),
        this.type('boolean')
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
