const inflection = require('inflection');

exports.sortByRelated = function(relation, property) {
  return function(query, direction, queryBuilder) {
    queryBuilder.requireRelation(relation);
    return query.query(qb => qb.orderBy(`${relation}.${inflection.underscore(property)}`, direction));
  };
};

exports.sortByRelatedProperty = function(property, marker, options) {
  if (!options) {
    throw new Error('Options are required');
  } else if (!options.table) {
    throw new Error('"table" option is required');
  } else if (!options.relationTable) {
    throw new Error('"relationTable" option is required');
  }

  const table = options.table;
  const relationTable = options.relationTable;
  const relation = options.relation || relationTable;
  const join = options.join || `${relationTable} as ${relation}`;
  const foreignKey = options.foreignKey || `${table}.${relation}_id`;
  const relationForeignKey = options.relationForeignKey || `${relation}.id`;

  return function(query, direction) {
    if (!query[marker]) {
      query[marker] = true;
      query = query.query(qb => qb.innerJoin(join, foreignKey, relationForeignKey));
    }

    return query.orderBy(`${relation}.${inflection.underscore(property)}`, direction);
  };
};
