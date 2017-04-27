const _ = require('lodash');

const THEMES = [ 'bird', 'butterfly', 'flower', 'tree' ];

exports.themesValid = function() {
  return function(context) {

    var themes = context.get('value');
    if (!_.isArray(themes)) {
      return;
    }

    const invalid = _.reject(themes, theme => _.isString(theme) && _.includes(THEMES, theme));

    if (invalid.length) {
      context.addError({
        validator: 'excursion.themesValid',
        message: `contains invalid themes (${invalid.join(', ')})`
      });
    }
  };
};

exports.zonesValid = function() {
  return function(context) {

    var zones = context.get('value');
    if (!_.isArray(zones)) {
      return;
    }

    const invalid = _.reject(zones, zone => _.isInteger(zone) && zone >= 0 && zone <= 14);

    if (invalid.length) {
      context.addError({
        validator: 'excursion.zonesValid',
        message: `contains invalid zones outside the 0-14 range (${invalid.join(', ')})`
      });
    }
  };
};
