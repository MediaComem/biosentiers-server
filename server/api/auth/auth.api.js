var auth = require('../../lib/auth'),
    bcrypt = require('bcryptjs'),
    LocalStrategy = require('passport-local').Strategy,
    passport = require('passport'),
    policy = require('../users/users.policy'),
    User = require('../../models/user');

setUpPassport();

exports.authenticate = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {

    var error = err || info;
    if (error) {
      return res.status(401).json(error);
    } else if (!user) {
      return res.status(404).json({ message: 'Something went wrong, please try again.' });
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
      active: true,
      email: email.toLowerCase()
    }).fetch().then(function(user) {
      if (!user) {
        return done(null, false, { message: 'This user is not registered or inactive.' });
      } else if (!bcrypt.compareSync(password, user.get('password_hash'))) {
        return done(null, false, { message: 'The e-mail or password is invalid.' });
      } else {
        return done(null, user);
      }
    }).catch(done);
  }));
}
