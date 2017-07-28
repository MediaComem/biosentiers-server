const _ = require('lodash');
const Participant = require('../../models/participant');

exports.nameAvailable = function(excursion, existingParticipant) {
  return function(context) {

    const name = context.get('value');
    if (!_.isString(name) || _.isEmpty(name.trim())) {
      return;
    }

    let query = new Participant().whereName(name).where('excursion_id', excursion.get('id'));

    if (existingParticipant) {
      query = query.query(function(queryBuilder) {
        queryBuilder.whereNot('id', existingParticipant.get('id'));
      });
    }

    return query.fetch().then(function(participant) {
      if (participant) {
        context.addError({
          validator: 'participant.nameAvailable',
          message: 'is already taken'
        });
      }
    });
  };
};
