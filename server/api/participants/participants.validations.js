var _ = require('lodash'),
    Participant = require('../../models/participant');

exports.nameAvailable = function(existingParticipant) {
  return function(context) {

    var name = context.state.value;
    if (!_.isString(name) || _.isEmpty(name.trim())) {
      return;
    }

    var query = new Participant().whereName(name);

    if (existingParticipant) {
      query = query.query(function(queryBuilder) {
        queryBuilder.whereNot('id', existingParticipant.get('id'));
      });
    }

    return query.fetch().then(function(user) {
      if (user) {
        context.addError({
          code: 'validation.name.taken',
          message: (context.state.valueDescription || 'Value') + ' is already taken.'
        });
      }
    });
  };
};
