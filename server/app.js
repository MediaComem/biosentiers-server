var bodyParser = require('body-parser'),
    config = require('../config'),
    errors = require('./lib/express-errors'),
    express = require('express'),
    favicon = require('serve-favicon'),
    log4js = require('log4js'),
    path = require('path');

var app = express();

// Configure the view engine (used only for error pages; all other pages
// are served statically from the build directory).
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Configure initial middleware.
if (config.env != 'test') {
  app.use(favicon(path.join(config.buildDir, 'favicon.ico')));
}

app.use(bodyParser.json());

// Log all HTTP requests.
app.use(require('./lib/express-logger'));

// Serve static files.
if (config.env != 'production') {
  app.use(express.static(config.buildDir));
  // Serve files directly out of `client` and `node_modules` in development.
  app.use('/client', express.static(config.path('client')));
  app.use('/node_modules', express.static(config.path('node_modules')));
} else {
  // In production, all files are copied or compiled to the build directory.
  app.use(express.static(config.buildDir));
}

// Serve API requests.
app.use('/api', require('./api'));

// Catch 404 (e.g. missing asset) and forward to the next error handler.
app.use(errors.catch404);

// Serve the index page.
app.use('/', require('./lib/express-index'));

// Handle errors.
app.use(errors.handler);

module.exports = app;
