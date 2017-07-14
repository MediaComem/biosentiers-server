const _ = require('lodash');
const BPromise = require('bluebird');
const inflection = require('inflection');
const pagination = require('./pagination');
const utils = require('./utils');

function QueryBuilder(req, res, base) {
  this.req = req;
  this.res = res;
  this.query = base;
  this.paginated = false;
  this.filters = [];
  this.related = [];
  this.modifiers = [];
  this.possibleSorts = {};
}

_.extend(QueryBuilder.prototype, {
  paginate: activePagination,
  filter: addFilters,
  sort: addPossibleSort,
  sorts: addPossibleSorts,
  defaultSort: setDefaultSort,
  fetch: fetch,
  eagerLoad: loadRelated,
  modify: addModifier
});

module.exports = QueryBuilder;

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
    } else if (_.isObject(sort)) {
      _.each(sort, (value, key) => {
        if (_.isArray(value)) {
          setPossibleSort(this.possibleSorts, key, sortDefinitionsToSortFunction(...value));
        } else {
          setPossibleSort(this.possibleSorts, key, sortDefinitionsToSortFunction(value));
        }
      });
    } else if (!_.isFunction(sort)) {
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

  return function(query, direction) {
    sorts.forEach(sortFunc => query = sortFunc(query, direction));
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
    defaultSort: this._defaultSort
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
  return data.query.clone().count().then(function(count) {
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

  return applyFiltersRecursively(data, data.filters.slice()).then(function() {
    if (data.filtered) {
      return countFilteredTotal(data);
    } else {
      pagination.setPaginationFilteredTotal(data.res, data.total);
    }
  });
}

function applyFiltersRecursively(data, filters) {

  const currentFilters = filters.shift();
  if (!currentFilters) {
    return;
  }

  return BPromise.map(currentFilters, function(filter) {
    return BPromise.resolve(filter(data.query, data.req)).then(function(result) {
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
    data.query = data.possibleSorts[sort.property](data.query, sort.direction);
  });

  if (data.defaultSort && !_.find(querySorts, { property: data.defaultSort.property })) {
    data.query = data.possibleSorts[data.defaultSort.property](data.query, data.defaultSort.direction);
  }
}
