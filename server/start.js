const _ = require('lodash');
const app = require('./app');
const config = require('../config');
const db = require('./db');
const http = require('http');

module.exports = function() {

  const logger = config.logger('start');

  // Get port from environment and store in Express.
  const port = normalizePort(config.port);
  app.set('port', port);

  // Create HTTP server.
  const server = http.createServer(app);

  db.ensureConnected().then(function() {

    const connection = db.knex.client.config.connection;
    logger.debug(`Connected to database ${connection.database} on ${connection.host || 'local unix socket'}`);

    // Listen on provided port, on all network interfaces.
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
  }).catch(_.bind(logger.error, logger));

  // Normalize a port into a number, string, or false.
  function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
      // named pipe
      return val;
    }

    if (port >= 0) {
      // port number
      return port;
    }

    return false;
  }

  // Event listener for HTTP server "error" event.
  function onError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  // Event listener for HTTP server "listening" event.
  function onListening() {

    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;

    logger.info('Listening on ' + bind);
  }
};
