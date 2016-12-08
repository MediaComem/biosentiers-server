var _ = require('lodash'),
    valdsl = require('valdsl');

var dsl = valdsl();

var proto = dsl.ValidationContext.prototype,
    serializeError = proto.serializeError;

proto.serializeError = function() {

  var base = serializeError.apply(this, arguments);

  if (base.location) {
    base.location = base.location.toString();
  }

  base = _.pick(base, 'code', 'type', 'location', 'message');

  return base;
};

module.exports = dsl;
