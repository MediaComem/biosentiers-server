const _ = require('lodash');
const BPromise = require('bluebird');
const inflection = require('inflection');
const pagination = require('./pagination');
const utils = require('./utils');

// This corresponds to Knex's query builder methods.
const JOIN_TYPES = [ 'innerJoin', 'leftOuterJoin', 'rightOuterJoin' ];

function QueryBuilder(req, res, base) {
  this.req = req;
  this.res = res;
  this.query = base;
  this.paginated = false;
  this.filters = [];
  this.related = [];
  this.modifiers = [];
  this.possibleSorts = {};
  this.requiredRelations = [];
}

_.extend(QueryBuilder.prototype, {
  paginate: activePagination,
  filter: addFilters,
  sort: addPossibleSort,
  sorts: addPossibleSorts,
  defaultSort: setDefaultSort,
  fetch: fetch,
  eagerLoad: loadRelated,
  modify: addModifier,
  joins: addJoinManager,
  requireRelation: requireRelation
});

function requireRelation(relation) {
  if (!relation) {
    throw new Error('Join relation is required');
  } else if (!_.includes(this.joinsManager.relations, relation)) {
    throw new Error(`No join defined for relation "${relation}"`);
  }

  if (!_.includes(this.requiredRelations, relation)) {
    this.requiredRelations.push(relation);
  }
}

function addJoinManager(table, callback) {
  this.joinsManager = new QueryJoins(table);
  callback(this.joinsManager);
  return this;
}

function addModifier(...args) {
  this.modifiers.push(...args);
  return this;
}

function activePagination() {
  this.paginated = true;
  return this;
}

function addFilters() {
  this.filters.push(Array.prototype.slice.call(arguments));
  return this;
}

function setDefaultSort(property, direction) {
  if (!this.possibleSorts[property]) {
    throw new Error(`Sort "${property}" is not defined`);
  } else if (direction !== undefined && (!_.isString(direction) || !direction.match(/^(?:asc|desc)$/i))) {
    throw new Error('Direction must be "ASC" or "DESC"');
  }

  this._defaultSort = {
    property: property,
    direction: direction ? direction.toUpperCase() : 'ASC'
  };

  return this;
}

function addPossibleSort(property, ...sortDef) {
  setPossibleSort(this.possibleSorts, property, sortDefinitionsToSortFunction(...sortDef));
  return this;
}

function addPossibleSorts(...sorts) {
  _.each(sorts, sort => {
    if (_.isString(sort)) {
      setPossibleSort(this.possibleSorts, sort, sortDefinitionsToSortFunction(sort));
    } else if (_.isFunction(sort)) {
      const result = sort();
      if (_.isArray(result)) {
        addPossibleSorts.apply(this, result);
      } else if (result) {
        addPossibleSorts.call(this, result);
      }
    } else if (_.isObject(sort)) {
      _.each(sort, (value, key) => {
        if (_.isArray(value)) {
          setPossibleSort(this.possibleSorts, key, sortDefinitionsToSortFunction(...value));
        } else {
          setPossibleSort(this.possibleSorts, key, sortDefinitionsToSortFunction(value));
        }
      });
    } else {
      throw new Error('Sort definitions must be a string, object or function');
    }
  });

  return this;
}

function setPossibleSort(sorts, property, sortFunc) {
  if (!property) {
    throw new Error('Sort property is required');
  } else if (sorts[property]) {
    throw new Error(`There is already a sorting function defined for property "${property}"`);
  }

  sorts[property] = sortFunc;
}

function sortDefinitionsToSortFunction(...sortDef) {
  if (!sortDef.length) {
    throw new Error('At least one sort property or function must be specified');
  }

  const sorts = sortDef.map(property => {
    if (_.isFunction(property)) {
      return property;
    } else if (_.isString(property)) {
      return function(query, direction) {
        return query.orderBy(inflection.underscore(property), direction);
      };
    } else {
      throw new Error(`Sort property must be a string or a function, got ${JSON.stringify(property)} (${typeof(property)})`);
    }
  });

  return function(...args) {
    sorts.forEach(sortFunc => query = sortFunc(...args));
    return query;
  };
}

function fetch(options) {

  const data = {
    req: this.req,
    res: this.res,
    query: this.query,
    filters: this.filters,
    possibleSorts: this.possibleSorts,
    defaultSort: this._defaultSort,
    filterJoins: [],
    sortJoins: [],
    queryBuilder: this
  };

  let promise = BPromise.resolve();

  if (this.paginated) {
    promise = promise
      .return(data)
      .then(paginate);
  }

  if (this.modifiers) {
    _.each(this.modifiers, (modifier) => {
      promise = promise
        .then(() => {
          return BPromise.resolve(modifier(data.query)).then((result) => {
            if (!result || !result.query) {
              throw new Error('Modifier functions must return an object with a "query" property');
            }

            data.query = result.query;
            return data;
          });
        });
    });
  }

  if (!_.isEmpty(this.possibleSorts)) {
    promise = promise
      .return(data)
      .then(applySorting);
  }

  promise = promise
    .return(data)
    .then(() => {
      if (this.requiredRelations.length) {
        data.query = data.queryBuilder.joinsManager.apply(data.query, data.queryBuilder.requiredRelations);
      }
    });

  if (_.get(options, 'head')) {
    return promise.then(() => {
      return _.pick(data, 'total', 'filteredTotal');
    });
  }

  promise = promise
    .return(data)
    .then(data => {
      if (data.query.fetchAll) {
        return data.query.fetchAll();
      } else {
        return data.query.fetch();
      }
    });

  if (this.related && this.related.length) {
    _.each(this.related, related => {
      promise = promise.then(function(collection) {
        return collection.load(related).then(() => collection);
      });
    });
  }

  if (_.get(options, 'collection')) {
    return promise;
  } else {
    return promise.get('models');
  }
}

function loadRelated(related) {
  this.related.push(related);
  return this;
}

function paginate(data) {

  _.extend(data, pagination.setUpPagination(data.req, data.res));

  return BPromise
    .resolve(data).then(countTotal)
    .return(data).then(checkFiltered)
    .return(data).then(applyPagination);
}

function countTotal(data) {
  return data.query.clone().count().then(function(count) {
    data.total = count;
    pagination.setPaginationTotal(data.res, count);
  });
}

function countFilteredTotal(data) {
  return data.query.count().then(function(count) {
    data.filteredTotal = count;
    pagination.setPaginationFilteredTotal(data.res, count);
  });
}

function applyPagination(data) {
  return data.query.query(function(queryBuilder) {
    queryBuilder.offset(data.offset).limit(data.limit);
  });
}

function checkFiltered(data) {
  if (_.isEmpty(data.filters)) {
    pagination.setPaginationFilteredTotal(data.res, data.total);
    return;
  }

  data.originalQuery = data.query;
  data.query = data.query.clone();

  return applyFiltersRecursively(data, data.filters.slice()).then(function() {

    let promise = BPromise.resolve();
    if (data.filtered) {
      if (data.queryBuilder.joinsManager) {
        data.query = data.queryBuilder.joinsManager.apply(data.query, data.queryBuilder.requiredRelations);
      }

      promise = countFilteredTotal(data);
    } else {
      pagination.setPaginationFilteredTotal(data.res, data.total);
    }

    return promise.then(() => {
      data.query = data.originalQuery;
      delete data.originalQuery;
      return applyFiltersRecursively(data, data.filters.slice());
    });
  });
}

function applyFiltersRecursively(data, filters) {

  const currentFilters = filters.shift();
  if (!currentFilters) {
    return;
  }

  return BPromise.map(currentFilters, function(filter) {
    return BPromise.resolve(filter(data.query, data.req, data.queryBuilder)).then(function(result) {
      if (result) {
        data.query = result;
        data.filtered = true;
      }
    });
  }).return(data).then(_.partial(applyFiltersRecursively, _, filters));
}

function applySorting(data) {

  let querySorts = utils.multiValueParam(data.req.query.sort, _.identity, criterion => {
    const match = criterion.match(/^(.*?)(?:-(asc|desc))?$/i);
    return {
      property: match[1],
      direction: match[2] ? match[2].toUpperCase() : 'ASC'
    };
  });

  // TODO: validate sort query parameters instead of silently ignoring invalid ones
  querySorts = _.filter(querySorts, sort => data.possibleSorts[sort.property]);

  _.each(querySorts, sort => {
    data.query = data.possibleSorts[sort.property](data.query, sort.direction, data.queryBuilder);
  });

  if (data.defaultSort && !_.find(querySorts, { property: data.defaultSort.property })) {
    data.query = data.possibleSorts[data.defaultSort.property](data.query, data.defaultSort.direction, data.queryBuilder);
  }
}

class QueryJoins {
  constructor(table) {
    if (!_.isString(table)) {
      throw new Error('Table name must be a string');
    }

    this.table = table;
    this.possibleJoins = [];
    this.relations = [];
    this.mandatoryJoins = {};
  }

  join(...args) {

    const joinDef = new JoinDefinition(this.table, ...args);
    this.possibleJoins.push(joinDef);

    _.each(joinDef.relations, relation => {
      if (_.includes(this.relations, relation)) {
        delete this.mandatoryJoins[relation];
      } else {
        this.relations.push(relation);
        this.mandatoryJoins[relation] = joinDef;
      }
    });

    return this;
  }

  apply(query, requiredRelations) {
    if (!requiredRelations.length) {
      return query;
    }

    const joinsToApply = [];
    const remainingRelations = requiredRelations.slice();

    _.each(_.intersection(requiredRelations, _.keys(this.mandatoryJoins)), relation => {

      const mandatoryJoin = this.mandatoryJoins[relation];
      if (!_.includes(joinsToApply, mandatoryJoin)) {
        joinsToApply.push(mandatoryJoin);
      }

      _.pull(remainingRelations, relation);
    });

    if (remainingRelations.length) {
      const remainingJoins = _.difference(this.possibleJoins, joinsToApply);

      const validJoinChain = this.recursivelyFindCompatibleJoinsChain(remainingJoins, remainingRelations.slice());
      if (validJoinChain) {
        _.each(validJoinChain, join => joinsToApply.push(join));
        remainingRelations.length = 0;
      }

      if (remainingRelations.length) {
        throw new Error(`Could not find enough compatible joins to give access to the following relations: ${requiredRelations.join(', ')}`);
      }
    }

    _.each(joinsToApply, join => {
      query = join.apply(query);
    });

    return query;
  }

  recursivelyFindCompatibleJoinsChain(joins, relations) {

    const joinScores = _.reduce(joins, (memo, join, i) => {
      memo[i] = _.intersection(join.relations, relations).length;
      return memo;
    }, []);

    if (_.includes(joinScores, relations.length)) {
      return [
        _.find(joins, (join, i) => joinScores[i] === relations.length)
      ];
    } else {

      let currentScore = _.min(joinScores);
      const maxScore = _.max(joinScores);
      while (currentScore <= maxScore) {

        const currentJoins = _.filter(joins, (join, i) => joinScores[i] === currentScore);
        while (currentJoins.length) {
          const currentJoin = currentJoins.shift();
          const validChain = this.recursivelyFindCompatibleJoinsChain(currentJoins, _.difference(relations, currentJoin.relations));
          if (validChain) {
            return [ currentJoin, ...validChain ];
          }
        }

        currentScore++;
      }
    }
  }
}

class JoinDefinition {
  constructor(table, relations, options) {
    this.table = table;

    this.relations = _.uniq(_.isArray(relations) ? relations : _.compact([ relations ]));
    if (!this.relations.length) {
      throw new Error('Relations is required');
    } else if (!_.every(this.relations, _.isString)) {
      throw new Error('Relations must be an array of strings');
    }

    this.relationOptions = _.extend({}, options);
  }

  apply(query) {
    return query.query(qb => {
      return _.reduce(this.relations, (memo, relation) => {

        const options = this.relationOptions;
        const table = this.table;
        const joinType = options.type || 'innerJoin';
        const joinTable = options.joinTable || relation;
        const key = options.key || `${table}.id`;
        const joinKey = options.joinKey || `${joinTable}.${table}_id`;

        return memo[joinType](`${joinTable} as ${relation}`, key, joinKey);
      }, qb);
    })
  }

  isCompatibleWith(otherJoin) {
    return _.intersection(this.relations, otherJoin.relations).length === 0;
  }
}

module.exports = QueryBuilder;
