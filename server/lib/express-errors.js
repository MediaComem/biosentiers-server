var config = require('../../config');

exports.catch404 = function(req, res, next) {

  // If the path does not have an extension, it's probably an Angular
  // route, so the request should be handled by the next middleware.
  if (!req.path.match(/\.[^\.]+$/)) {
    return next();
  }

  // Otherwise it's probably an asset that doesn't exist,
  // so an error page should be displayed.
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
};

exports.handler = function(err, req, res, next) {

  var data = {
    message: err.message,
    error: {}
  };

  if (config.env == 'development') {
    data.error = err;
  }

  // Display the HTML error page.
  res.status(err.status || 500);
  res.render('error', data);
};
