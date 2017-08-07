exports.isExpressRequest = function(object) {
  return !!object && !!object.app && !!object.originalUrl;
};

exports.ensureExpressRequest = function(object) {
  if (!exports.isExpressRequest(object)) {
    throw new Error(`Argument does not appear to be an Express request object (type is ${typeof(object)})`);
  }

  return object;
};
