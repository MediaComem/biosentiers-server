const _ = require('lodash');
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

  const user = User.parseJson(req);
  await user.save();

  if (req.jwtToken.authType == 'invitation') {
    req.currentUser = user;
  }

  res.status(201).send(serialize(req, user, policy));
});

exports.list = route(async function(req, res) {

  const query = policy.scope(req);
  const users = await new QueryBuilder(req, res, query)
    .paginate()
    .filter(filterByEmail)
    .sort('email', 'createdAt')
    .fetch();

  res.send(serialize(req, users, policy));

  function filterByEmail(query) {
    if (_.isString(req.query.email)) {
      return query.whereEmail(req.query.email);
    }
  }
});

exports.retrieve = route(async function(req, res) {
  res.send(serialize(req, req.user, policy));
});

exports.update = route.transactional(async function(req, res) {

  const user = req.user;
  await np(validateUserForUpdate(req));
  policy.parseRequestIntoRecord(req, user);

  const password = req.body.password;
  const previousPassword = req.body.previousPassword;

  if (user.get('password_hash') && password && user.hasPassword(previousPassword)) {
    user.set('password', password);
  } else if (!user.get('password_hash') && password) {
    user.set('password', password);
  }

  await user.save();

  res.send(serialize(req, user, policy));
});

exports.fetchUser = fetcher({
  model: User,
  resourceName: 'user'
});

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
      )
    );
  });
}
