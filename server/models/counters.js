const _ = require('lodash');
const db = require('../db');

exports.increment = function(table, id, name, value) {
  if (!id) {
    throw new Error('ID is required');
  } else if (value !== undefined && !_.isInteger(value)) {
    throw new Error(`Value must be an integer, got ${JSON.stringify(value)}`);
  }

  const column = `${name}_count`;
  return db.knex.raw(`UPDATE ${table} SET ${column} = ${column} + ${value || 1} WHERE id = ${id};`);
};

exports.decrement = function(table, id, name, value) {
  return exports.increment(table, id, name, _.isInteger(value) ? -value : (value !== undefined ? value : -1));
};
