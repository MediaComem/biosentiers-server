var _ = require('lodash'),
    valdsl = require('valdsl');

valdsl.ValidationContext.extend({
  ifSet: ifSet,
  patchMode: patchMode
});

var proto = valdsl.ValidationContext.prototype,
    serializeError = proto.serializeError;

proto.serializeError = function() {
  var base = serializeError.apply(this, arguments);
  return _.pick(base, 'code', 'type', 'location', 'message');
};

module.exports = valdsl;

function ifSet() {
  return function(context) {
    context.conditions.push(function(context) {
      return context.state.valueSet;
    });
  };
}

function patchMode(changed) {
  if (!_.isFunction(changed)) {
    var previousValue = changed;
    changed = function(value) {
      return value !== previousValue;
    };
  }

  return function(context) {
    context.conditions.push(function(context) {
      return context.state.valueSet && changed(context.state.value);
    });
  };
}
