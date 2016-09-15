var bodyParser = require('body-parser'),
    config = require('../config'),
    express = require('express'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    path = require('path');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var indexPath = config.path('build/development');
function serveIndex(req, res) {
  res.sendFile('index.html', { root: indexPath });
}

if (config.env != 'production') {
  app.use(express.static(config.path('build', 'development')));
  app.use('/client', express.static(config.path('client')));
  app.use('/node_modules', express.static(config.path('node_modules')));
} else {
  indexPath = config.path('build/production');
  app.use(express.static(config.path('build', 'production')));
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
