var _ = require('lodash'),
    db = require('../db'),
    httpStatuses = require('http-status'),
    Promise = require('bluebird');

exports.cleanDatabase = function() {
  return Promise.all([
    db.knex.raw('TRUNCATE user_account')
  ]).return();
};

exports.createExpectation = function(checkFunc) {

  checkFunc.responseChecker = function(expected) {
    return function(res) {

      var args = Array.prototype.slice.call(arguments, 1);
      args.unshift(expected);
      args.unshift(res.body);

      return Promise.resolve(args).spread(checkFunc).catch(function(err) {
        if (err.name == 'AssertionError') {
          err.message = err.message + '\n\nHTTP/1.1 ' + res.status;

          var code = httpStatuses[res.status];
          if (code) {
            err.message = err.message + ' ' + code;
          }

          _.each(res.headers, function(value, key) {
            err.message = err.message + '\n' + key + ': ' + value;
          });

          if (res.body) {
            err.message = err.message + '\n\n';

            var contentType = res.get('Content-Type');
            if (contentType.match(/^application\/json/)) {
              err.message = err.message + JSON.stringify(res.body, null, 2);
            } else {
              err.message = err.message + res.body.toString();
            }
          }
        }

        return Promise.reject(err);
      });
    }
  };

  return checkFunc;
};
