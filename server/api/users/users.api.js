const _ = require('lodash');
const BPromise = require('bluebird');
const errors = require('../errors');
const fetcher = require('../fetcher');
const mailer = require('../../lib/mailer');
const np = require('../../lib/native-promisify');
const policy = require('./users.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const User = require('../../models/user');
const validate = require('../validate');
const validations = require('../users/users.validations');

// API resource name (used in some API errors).
exports.resourceName = 'user';

exports.create = route.transactional(async function(req, res) {

  if (req.jwtToken.authType == 'invitation') {
    _.extend(req.body, {
      active: true,
      email: req.jwtToken.email,
      role: req.jwtToken.role,
    });

    _.defaults(req.body, {
      firstName: req.jwtToken.firstName,
      lastName: req.jwtToken.lastName
    });
  }

  await np(validateUser(req));

  const user = policy.parse(req, new User(), 'password');
  await user.save();

  if (req.jwtToken.authType == 'invitation') {
    req.currentUser = user;
  }

  res.status(201).send(await serialize(req, user, policy));
});

exports.list = route(async function(req, res) {

  const query = policy.scope(req);
  const users = await new QueryBuilder(req, res, query)
    .paginate()
    .filter(filterByEmail)
    .sorts('firstName', 'lastName', 'email', 'createdAt', 'updatedAt')
    .defaultSort('email')
    .fetch();

  res.send(await serialize(req, users, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(await serialize(req, req.user, policy));
});

exports.update = route.transactional(async function(req, res) {

  const user = req.user;
  await np(validateUserForUpdate(req));

  const passwordChangeRequest = req.jwtToken.authType == 'passwordReset';
  if (passwordChangeRequest) {

    // Make sure the password reset count in the JWT token is the same as the user's
    const passwordResetCount = user.get('password_reset_count');
    if (!_.isNumber(passwordResetCount) || passwordResetCount < 0 || req.jwtToken.passwordResetCount !== passwordResetCount) {
      throw errors.invalidAuthorization();
    }

    // Increment the password reset count so that the token is no longer valid
    await user.incrementPasswordResetCount();
  } else {
    policy.parse(req, user);
  }

  const password = req.body.password;
  const previousPassword = req.body.previousPassword;
  if (user.get('password_hash') && password && passwordChangeRequest) {
    user.set('password', password);
  } else if (user.get('password_hash') && password && user.hasPassword(previousPassword)) {
    user.set('password', password);
  } else if (!user.get('password_hash') && password) {
    user.set('password', password);
  }

  await user.save();

  res.send(await serialize(req, user, policy));
});

exports.fetchUser = fetcher({
  model: User,
  resourceName: 'user'
});

exports.fetchMe = function(req, res, next) {
  BPromise.resolve().then(() => {
    if (req.jwtToken.authType == 'user') {
      return new User().where('api_id', req.jwtToken.sub).fetch().then(user => {
        if (!user) {
          throw new Error(`Could not fetch user from JWT token "sub" property (${req.jwtToken.sub})`);
        }

        req.user = user;
      });
    } else if (req.jwtToken.authType == 'passwordReset') {
      return new User().where('email', req.jwtToken.email).fetch().then(user => {
        if (!user) {
          throw errors.unauthorized();
        }

        req.user = user;
      });
    } else {
      throw new Error('Cannot fetch "me" user; no valid "user" or "passwordReset" JWT token found');
    }
  }).then(next, next);
};

function filterByEmail(query, req) {
  if (_.isString(req.query.email)) {
    return query.whereEmail(req.query.email);
  }
}

function validateUser(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/firstName'),
        this.required(),
        this.type('string'),
        this.notEmpty()
      ),
      this.validate(
        this.json('/lastName'),
        this.required(),
        this.type('string'),
        this.notEmpty()
      ),
      this.validate(
        this.json('/active'),
        this.type('boolean')
      ),
      this.validate(
        this.json('/email'),
        this.required(),
        this.type('string'),
        this.notEmpty(),
        this.email(),
        validations.emailAvailable()
      ),
      this.validate(
        this.json('/password'),
        this.required(),
        this.type('string'),
        this.notEmpty()
      ),
      this.validate(
        this.json('/role'),
        this.while(this.isSet()),
        this.type('string'),
        this.inclusion({ in: User.roles })
      )
    );
  });
}

function validateUserForUpdate(req) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.validate(
        this.json('/password'),
        this.while(this.changed()),
        this.type('string'),
        this.notEmpty()
      ),
      // Validate previous password if password is set
      this.if(
        context => context.get('value').password !== undefined && req.jwtToken.authType != 'passwordReset',
        this.validate(
          this.json('/previousPassword'),
          this.required(),
          this.type('string'),
          this.notEmpty()
        ),
        // If the previous password is a valid string, check that it's the correct password
        this.if(
          this.noError({ location: '/previousPassword' }),
          validations.previousPasswordMatches(req.user, req.jwtToken)
        )
      )
    );
  });
}
