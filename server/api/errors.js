var config = require('../../config'),
    util = require('util');

function ApiError(status, code, message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.status = status;
  this.code = code;
  this.message = message;
};

util.inherits(ApiError, Error);

exports.ApiError = ApiError;

exports.unauthorized = function(code, message) {
  return new ApiError(401, code, message || 'Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.');
};

exports.forbidden = function(code, message) {
  return new ApiError(403, code, message || 'You are not authorized to access this resource. Authenticate with a user account that has more privileges.');
};

exports.notFound = function(code, message) {
  return new ApiError(404, code || 'resource.notFound', message || 'No resource was found at this verb and URI.');
};

exports.recordNotFound = function(name, id) {
  return exports.notFound('record.notFound', 'No ' + name + ' was found with ID ' + id + '.');
};
