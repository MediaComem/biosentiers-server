const moment = require('moment');

exports.iso8601 = function() {
  return function(context) {
    const value = context.get('value');
    if (typeof(value) != 'string' || !moment(value, moment.ISO_8601).isValid()) {
      context.addError({
        validator: 'iso8601',
        message: 'is not a valid ISO-8601 date'
      });
    }
  };
};
