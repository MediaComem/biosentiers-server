const _ = require('lodash');
const auth = require('../auth');
const BPromise = require('bluebird');
const config = require('../../../config');
const crypto = require('crypto');
const errors = require('../errors');
const Installation = require('../../models/installation');
const installationsPolicy = require('../installations/installations.policy');
const jwt = require('../../lib/jwt');
const LocalStrategy = require('passport-local').Strategy;
const mailer = require('../../lib/mailer');
const mails = require('../../mails');
const moment = require('moment');
const np = require('../../lib/native-promisify');
const passport = require('passport');
const policy = require('./auth.policy');
const qs = require('qs');
const route = require('../route');
const serialize = require('../serialize');
const User = require('../../models/user');
const userValidations = require('../users/users.validations');
const usersPolicy = require('../users/users.policy');
const validate = require('../validate');
const validations = require('../lib/validations');
const { hrefToApiId } = require('../../lib/href');

setUpPassport();

const logger = config.logger('api:auth');
const passportLocalAuthenticate = BPromise.promisify(passport.authenticate('local'));

// API resource name (used in some API errors).
exports.resourceName = 'auth';

exports.authenticate = route(async function(req, res) {
  if (req.body.installation) {
    return authenticateInstallation(req, res);
  } else {
    return authenticateUser(req, res);
  }
});

exports.createInvitation = route(async function(req, res) {
  const invitationLink = await createInvitationLink(req);

  if (invitationLink.sent) {
    const templateOptions = {
      link: invitationLink.link
    };

    await mailer.send({
      to: invitationLink.email,
      subject: 'Invitation BioSentiers',
      html: mails.welcome.html(templateOptions),
      text: mails.welcome.txt(templateOptions)
    });
  }

  res.status(201).json(await serialize(req, invitationLink, policy.serializeInvitationLink));
});

exports.retrieveInvitation = route(async function(req, res) {

  // Returns a pseudo-resource containing the invitation's data.
  const invitation = _.extend(_.pick(req.jwtToken, 'email', 'role', 'firstName', 'lastName'), {
    createdAt: new Date(req.jwtToken.iat)
  });

  return res.json([ invitation ]);
});

exports.requestPasswordReset = route.transactional(async function(req, res) {
  const resetPasswordLink = await createPasswordResetLink(req);

  if (!req.currentUser) {
    const templateOptions = {
      link: resetPasswordLink.link
    };

    await mailer.send({
      to: resetPasswordLink.email,
      subject: 'Changement de mot de passe BioSentiers',
      html: mails.passwordReset.html(templateOptions),
      text: mails.passwordReset.txt(templateOptions)
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

async function authenticateUser(req, res) {
  await np(validateAuthentication(req));

  const email = _.get(req, 'body.email', '_').toString();
  const user = await new User({ email: email.toLowerCase() }).fetch();
  if (!user || !user.isActive()) {
    throw errors.unauthorized('auth.invalidUser', 'This user account does not exist or is inactive.');
  }

  const password = _.get(req, 'body.password');
  if (!_.isString(password) || !user.hasPassword(password)) {
    throw errors.unauthorized('auth.invalidCredentials', 'The e-mail or password is invalid.');
  }

  req.currentUser = user;

  // Increment login count of user
  await req.currentUser.saveNewLogin().catch(err => logger.warn('Could not save new user login', err));

  res.status(201).json({
    token: user.generateJwt({
      exp: moment().add(2, 'weeks').unix()
    }),
    user: usersPolicy.serialize(req, user)
  });
}

async function authenticateInstallation(req, res) {

  const installationId = hrefToApiId(req.body.installation.toString());
  const installation = await new Installation({ api_id: installationId }).fetch();
  if (!installation) {
    throw errors.unauthorized('auth.invalidInstallation', 'This installation does not exist or is inactive.');
  }

  await np(validateInstallationAuth(req));

  const dateString = req.body.date;
  const date = moment(dateString);
  if (!date.isValid()) {
    throw new Error(`Invalid installation authorization date ${req.body.date}`);
  }

  const minDate = moment().subtract(config.installationAuthThreshold, 'milliseconds');
  const maxDate = moment().add(config.installationAuthThreshold, 'milliseconds');
  if (!date.isBetween(minDate, maxDate)) {
    throw errors.unauthorized('auth.invalidCredentials', 'The provided authorization is invalid or has expired.');
  }

  const nonce = req.body.nonce;
  const authorization = req.body.authorization;

  const hmac = crypto.createHmac(config.installationAuthAlgorithm, installation.get('shared_secret'));
  hmac.update(`${installationId};${nonce};${dateString}`);
  const computedHmac = hmac.digest('hex');

  if (authorization !== computedHmac || !computedHmac) {
    throw errors.unauthorized('auth.invalidCredentials', 'The provided authorization is invalid or has expired.');
  }

  res.status(201).send({
    token: installation.generateJwt({
      exp: moment().add(1, 'day').unix()
    }),
    installation: installationsPolicy.serialize(req, installation)
  });
}

async function createInvitationLink(req) {
  await np(validateInvitation(req));

  const createdAt = moment();
  const expiresAt = moment(createdAt).add(2, 'days');

  const invitation = _.defaults(_.pick(req.body, 'email', 'role', 'firstName', 'lastName', 'sent'), {
    role: 'user'
  });

  const sent = _.get(req.body, 'sent', true);

  const jwtOptions = _.extend({}, invitation, {
    authType: 'invitation',
    iat: createdAt.unix(),
    exp: expiresAt.unix()
  });

  if (req.currentUser) {
    jwtOptions.iss = req.currentUser.get('api_id');
  }

  const token = jwt.generateToken(jwtOptions);

  const queryString = qs.stringify({
    invitation: token
  });

  return _.extend({}, invitation, {
    createdAt: createdAt.toDate(),
    expiresAt: expiresAt.toDate(),
    link: `${config.baseUrl}/register/complete?${queryString}`,
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
    sub: passwordResetUser.get('api_id'),
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

function validateAuthentication(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/email'),
        this.required(),
        this.type('string'),
        this.email()
      ),
      this.validate(
        this.json('/password'),
        this.required(),
        this.type('string'),
        this.notBlank()
      )
    )
  });
}

function validateInvitation(req) {
  const admin = req.currentUser && req.currentUser.get('active') && req.currentUser.hasRole('admin');
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/email'),
        this.required(),
        this.type('string'),
        this.email(),
        userValidations.emailAvailable()
      ),
      this.validate(
        this.json('/role'),
        this.while(this.isSet()),
        this.type('string'),
        admin ? this.inclusion({ in: User.roles }) : validations.equals('user')
      ),
      this.validate(
        this.json('/sent'),
        this.while(this.isSet()),
        this.type('boolean'),
        admin ? _.noop : validations.equals(true)
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
      userValidations.emailExists('passwordResetUser')
    );
  });
}

function validateInstallationAuth(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/authorization'),
        this.required(),
        this.type('string'),
        this.notBlank()
      ),
      this.validate(
        this.json('/installation'),
        this.required(),
        this.type('string'),
        this.notBlank()
      ),
      this.validate(
        this.json('/date'),
        this.required(),
        this.type('string'),
        validations.iso8601()
      ),
      this.validate(
        this.json('/nonce'),
        this.required(),
        this.type('string'),
        this.notBlank()
      )
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
