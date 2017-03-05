var _ = require('lodash'),
    User = require('../../models/user');

exports.emailAvailable = function(existingUser) {
  return function(context) {

    var email = context.get('value');
    if (!_.isString(email) || _.isEmpty(email.trim())) {
      return;
    }

    var query = new User().whereEmail(email);

    if (existingUser) {
      query = query.query(function(queryBuilder) {
        queryBuilder.whereNot('id', existingUser.get('id'));
      });
    }

    return query.fetch().then(function(user) {
      if (user) {
        context.addError({
          validator: 'user.emailAvailable',
          message: 'is already taken'
        });
      }
    });
  };
};
