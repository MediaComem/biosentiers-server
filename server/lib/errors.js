var config = require('../../config'),
    util = require('util');

function ApiError(message, status) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.status = status;
};

util.inherits(ApiError, Error);

exports.ApiError = ApiError;

function NotFoundError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message || 'Not Found';
  this.status = 404;
}

util.inherits(NotFoundError, Error);

exports.NotFoundError = NotFoundError;
