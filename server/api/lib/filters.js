const _ = require('lodash');
const inflection = require('inflection');
const moment = require('moment');

const DATE_COMPARISONS = [
  { type: 'eq', operator: '=', queryParamSuffix: '' },
  { type: 'gt', operator: '>' },
  { type: 'gte', operator: '>=' },
  { type: 'lt', operator: '<' },
  { type: 'lte', operator: '<=' }
];

exports.date = function(property, options) {

  const column = _.get(options, 'column', inflection.underscore(property));

  return function(query, req) {
    DATE_COMPARISONS.forEach(comparison => {

      const queryParamSuffix = inflection.capitalize(_.get(comparison, 'queryParamSuffix', comparison.type));
      const queryParam = `${property}${queryParamSuffix}`;

      const value = req.query[queryParam];
      if (value && moment(value).isValid()) {
        query = query.query(qb => qb.whereRaw(`${column} ${comparison.operator} ?`, value));
      }
    });

    return query;
  };
};
