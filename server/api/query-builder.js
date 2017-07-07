const _ = require('lodash');
const BPromise = require('bluebird');
const inflection = require('inflection');
const pagination = require('./pagination');

function QueryBuilder(req, res, base) {
  this.req = req;
  this.res = res;
  this.query = base;
  this.paginated = false;
  this.filters = [];
  this.related = [];
  this.modifiers = [];
}

_.extend(QueryBuilder.prototype, {
  paginate: activePagination,
  filter: addFilters,
  sort: setPossibleSorts,
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

function setPossibleSorts(sorts) {
  if (!_.isObject(sorts)) {
    sorts = _.reduce(Array.prototype.slice.call(arguments), function(memo, criterion) {
      memo[criterion] = inflection.underscore(criterion);
      return memo;
    }, {});
  }

  _.each(sorts, function(column, criterion) {
    if (!_.isFunction(column)) {
      sorts[criterion] = function(query, direction) {
        return query.orderBy(column, direction);
      };
    }
  });

  this.sorts = sorts;

  return this;
}

function fetch(options) {

  const data = {
    req: this.req,
    res: this.res,
    query: this.query,
    filters: this.filters,
    sorts: this.sorts
  };

  let promise = BPromise.resolve();

  if (this.paginated) {
    promise = promise
      .return(data)
      .then(paginate);
  }

  if (this.sorts) {
    promise = promise
      .return(data)
      .then(applySorting);
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
    return BPromise.resolve(filter(data.query)).then(function(result) {
      if (result) {
        data.query = result;
        data.filtered = true;
      }
    });
  }).return(data).then(_.partial(applyFiltersRecursively, _, filters));
}

function applySorting(data) {
  if (!data.sorts) {
    return;
  }

  let orderBy = data.req.query.sort;
  if (!orderBy) {
    return;
  }

  let direction = 'ASC';
  if (orderBy.match(/-desc$/i)) {
    direction = 'DESC';
    orderBy = orderBy.replace(/-desc$/i, '');
  }

  if (!data.sorts[orderBy]) {
    return;
  }

  data.query = data.sorts[orderBy](data.query, direction);
}
