var User = require('../../models/user');

module.exports = function(fixtures) {

  fixtures.define('user', function(data) {
    return new User({
      email: data.email || fixtures.generate('userEmail'),
      password: data.password || 'changeme',
      active: _.get(data, 'active', true),
      role: data.role || 'user',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    }).save();
  });

  fixtures.defineGenerator('userEmail', )

  var emailNumber = 0;
  module.exports.generateEmail = function generateEmail() {
    return 'user-' + (++emailNumber) + '@example.com';
  };
}
