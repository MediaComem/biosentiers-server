var _ = require('lodash'),
    valdsl = require('valdsl');

var dsl = valdsl();

var proto = dsl.ValidationContext.prototype,
    serializeError = proto.serializeError;

proto.serializeError = function() {
  var base = serializeError.apply(this, arguments);
  return _.pick(base, 'code', 'type', 'location', 'message');
};

dsl.ValidationContext.extendDsl({
  ifSet: ifSet,
  patchMode: patchMode,
  foreignKey: foreignKey
});

module.exports = dsl;

function foreignKey(model, options) {
  options = _.extend({}, options);

  return function(context) {
    return new model({ api_id: context.state.value }).fetch().then(function(record) {
      if (!record) {
        return context.addError({
          code: 'validation.related.invalid',
          message: 'Related resource not found.'
        });
      }

      if (_.isFunction(context.state.setValue)) {
        context.state.setValue(record, context.state.location.replace(/Id$/, ''));
      }
    });
  };
}

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
