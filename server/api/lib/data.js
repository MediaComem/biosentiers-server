const _ = require('lodash');

exports.buildSpecies = function(theme, species) {

  const result = {
    id: species.get('api_id'),
    characteristics: {
      habitat: species.get('habitat_characteristics')
    },
    periodStart: species.get('period_start'),
    periodEnd: species.get('period_end'),
    scientificName: species.get('scientific_name'),
    taxonomy: {
      family: species.related('family').get('name')
    },
    theme: theme,
    website: species.get('website')
  };

  switch (theme) {
    case 'bird':
      // TODO: check what the "calender" field is
      _.merge(result, {
        behavior: species.get('behavior'),
        characteristics: {
          nesting: species.get('nesting_characteristics'),
          physical: species.get('physical_characteristics'),
          sound: species.get('sound_characteristics')
        },
        comment: species.get('comment'),
        commonName: getCommonName(species),
        food: species.get('food'),
        height: species.related('height').get('description'),
        picture: {
          large: species.get('picture_large'),
          medium: species.get('picture_medium'),
          small: species.get('picture_small')
        },
        size: species.get('size'),
        taxonomy: {
          class: species.related('family').related('taxonomyClass').get('name'),
          reign: species.related('family').related('taxonomyClass').related('reign').get('name')
        },
        weight: species.get('weight'),
        wingspan: species.get('wingspan')
      });
      break;
    case 'butterfly':
      _.merge(result, {
        characteristics: {
          physical: {
            adult: species.get('physical_characteristics_adult'),
            child: species.get('physical_characteristics_child')
          }
        },
        comment: species.get('comment'),
        commonName: getCommonName(species),
        taxonomy: {
          class: species.related('family').related('taxonomyClass').get('name'),
          reign: species.related('family').related('taxonomyClass').related('reign').get('name')
        },
        wingspan: species.get('wingspan')
      });
      break;
    case 'flower':
      // TODO: check what obs_code_fh_2007 & obs_code_fh_2012 are
      _.merge(result, {
        anecdote: species.get('anecdote'),
        characteristics: {
          physical: species.get('physical_characteristics')
        },
        // TODO: store common_name lang list in constant
        commonName: getCommonName(species, 'fr', 'de', 'it', 'la'),
        height: species.get('height'),
        taxonomy: {
          division: species.related('family').related('division').get('name'),
          reign: species.related('family').related('division').related('reign').get('name')
        }
      });
      break;
    case 'tree':
      // TODO: check what obs_code_fh_2007 & obs_code_fh_2012 are
      _.merge(result, {
        anecdote: species.get('anecdote'),
        characteristics: {
          physical: species.get('physical_characteristics')
        },
        commonName: getCommonName(species, 'fr', 'de', 'it', 'la'),
        height: species.get('height'),
        taxonomy: {
          division: species.related('family').related('division').get('name'),
          reign: species.related('family').related('division').related('reign').get('name')
        }
      });
      break;
    default:
      throw new Error(`Unsupported theme ${theme}`);
  }

  return cleanUp(result);
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

function getCommonName(species, ...langs) {
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
}
