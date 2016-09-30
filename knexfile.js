// TODO: run knex migrations through gulp or document the required environment variables
var config = require('./config');

module.exports = {
  development: {
    client: 'postgresql',
    connection: config.db
  },

  staging: {
    client: 'postgresql',
    connection: config.db
  },

  production: {
    client: 'postgresql',
    connection: config.db
  }
};
