var _ = require('lodash'),
    User = require('../../models/user');

exports.emailAvailable = function(existingUser) {
  return function(context) {

    var email = context.state.value;
    if (!_.isString(email) || _.isEmpty(email.trim())) {
      return;
    }

    var query = new User().where('email', email.toLowerCase());
    if (existingUser) {
      query = query.query(function(queryBuilder) {
        queryBuilder.whereNot('id', existingUser.get('id'));
      });
    }

    return query.fetch().then(function(user) {
      if (user) {
        context.addError({
          code: 'validation.email.taken',
          message: (context.state.valueDescription || 'Value') + ' is already taken.'
        });
      }
    });
  };
}
