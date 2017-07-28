const _ = require('lodash');
const config = require('../../config');

const logger = config.logger('db');

module.exports = function(query) {
  let message = query.sql;

  if (query.bindings) {
    _.each(query.bindings, function(binding) {
      message = message.replace(/\?/, logValue(binding));
    });
  }

  if (!message.match(/;$/)) {
    message = message + ';';
  }

  logger.trace(message);
}

function logValue(value) {
  if (value === undefined) {
    return 'undefined';
  }

  if (value instanceof Buffer) {
    value = value.toString('hex');
  } else {
    value = JSON.stringify(value);
  }

  if (value.length > 50) {
    value = `${value.substring(0, 50)}...`;
  }

  return value;
}
