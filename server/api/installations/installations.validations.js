const _ = require('lodash');
const Installation = require('../../models/installation');

exports.idAvailable = function() {
  return function(context) {

    const id = context.get('value');
    let query = new Installation().query(qb => qb.whereRaw('LOWER(api_id) = ?', id.toLowerCase()));

    return query.fetch().then(function(installation) {
      if (installation) {
        context.addError({
          validator: 'installation.idAvailable',
          message: 'is already taken'
        });
      }
    });
  };
};
