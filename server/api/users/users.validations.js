const _ = require('lodash');
const User = require('../../models/user');

exports.emailAvailable = function(existingUser) {
  return function(context) {

    const email = context.get('value');
    if (!_.isString(email) || _.isEmpty(email.trim())) {
      return;
    }

    let query = new User().whereEmail(email);

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

exports.emailExists = function(dataKey) {
  return function(context) {
    const email = context.get('value');
    return new User()
      .whereEmail(email)
      .fetch()
      .then(function(user) {
        if (!user) {
          context.addError({
            validator: 'user.emailExists',
            message: 'does not exist'
          });
        } else if (dataKey) {
          context.setData(dataKey, user);
        }
      });
  };
}

exports.previousPasswordMatches = function(user) {
  return function(context) {

    const password = context.get('value').password;
    const previousPassword = context.get('value').previousPassword;

    if (password && (!previousPassword || !user.hasPassword(previousPassword))) {
      context.json('/previousPassword')(context);

      context.addError({
        validator: 'user.previousPassword',
        message: 'is incorrect'
      });
    }
  };
}
