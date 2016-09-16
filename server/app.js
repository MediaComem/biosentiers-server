var bodyParser = require('body-parser'),
    config = require('../config'),
    express = require('express'),
    favicon = require('serve-favicon'),
    log4js = require('log4js'),
    path = require('path');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

var buildDir = config.path('build', 'development');
if (config.env == 'production') {
  buildDir = config.path('build', 'production');
}

app.use(favicon(path.join(buildDir, 'favicon.ico')));
app.use(bodyParser.json());

function serveIndex(req, res) {
  res.sendFile('index.html', { root: buildDir });
}

var logger = config.logger('express'),
    connectLogger = log4js.connectLogger(logger, {
      level: log4js.levels.TRACE,
      format: ':method :url :status :response-time ms'
    });

app.use(connectLogger);

if (config.env != 'production') {
  app.use(express.static(buildDir));
  app.use('/client', express.static(config.path('client')));
  app.use('/node_modules', express.static(config.path('node_modules')));
} else {
  app.use(express.static(buildDir));
}

var router = express.Router();
router.get('/', serveIndex);
router.get('/*', serveIndex);
app.use('/', router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
