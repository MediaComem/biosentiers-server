var auth = require('../auth'),
    bcrypt = require('bcryptjs'),
    errors = require('../errors'),
    LocalStrategy = require('passport-local').Strategy,
    passport = require('passport'),
    policy = require('../users/users.policy'),
    User = require('../../models/user');

setUpPassport();

exports.authenticate = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('Could not authenticate user'));
    }

    req.user = user;

    res.json({
      token: user.jwt(),
      user: policy.serialize(user, req)
    });
  })(req, res, next);
};

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
      } else if (!bcrypt.compareSync(password, user.get('password_hash'))) {
        throw errors.unauthorized('auth.invalidCredentials', 'The e-mail or password is invalid.');
      } else {
        done(undefined, user);
      }
    }).catch(done);
  }));
}
