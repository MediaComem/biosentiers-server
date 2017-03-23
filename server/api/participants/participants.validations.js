var _ = require('lodash'),
    Participant = require('../../models/participant');

exports.nameAvailable = function(excursion, existingParticipant) {
  return function(context) {

    var name = context.get('value');
    if (!_.isString(name) || _.isEmpty(name.trim())) {
      return;
    }

    var query = new Participant().whereName(name).where('excursion_id', excursion.get('id'));

    if (existingParticipant) {
      query = query.query(function(queryBuilder) {
        queryBuilder.whereNot('id', existingParticipant.get('id'));
      });
    }

    return query.fetch().then(function(user) {
      if (user) {
        context.addError({
          validator: 'participant.nameAvailable',
          message: 'is already taken'
        });
      }
    });
  };
};
