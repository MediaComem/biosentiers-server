const _ = require('lodash');

exports.cleanUp = cleanUp;

exports.getCommonName = function(species, ...langs) {
  if (langs.length) {
    return _.reduce(langs, (memo, lang) => {
      memo[lang] = species.get(`common_name_${lang}`);
      return memo;
    }, {});
  } else {
    return {
      fr: species.get('common_name')
    };
  }
};

function cleanUp(data) {
  if (_.isString(data)) {
    return data.trim();
  } else if (_.isArray(data)) {
    return _.compact(data.map(cleanUp));
  } else if (_.isPlainObject(data)) {
    return _.reduce(data, (memo, value, key) => {
      if (value !== undefined && value !== null) {
        memo[key] = cleanUp(value);
      }

      return memo;
    }, {});
  } else {
    return data;
  }
}
