var _ = require('lodash'),
    inflection = require('inflection'),
    pagination = require('./pagination'),
    Promise = require('bluebird');

function QueryBuilder(req, res, base) {
  this.req = req;
  this.res = res;
  this.query = base;
  this.paginated = false;
}

_.extend(QueryBuilder.prototype, {
  paginate: activePagination,
  filter: setFilter,
  sort: setPossibleSorts,
  fetch: fetch
});

module.exports = QueryBuilder;

function activePagination() {
  this.paginated = true;
  return this;
}

function setFilter(filter) {

  this.filter = function(query) {
    return {
      query: filter(query)
    };
  };

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

function fetch() {

  var data = {
    req: this.req,
    res: this.res,
    query: this.query,
    filter: this.filter,
    sorts: this.sorts
  };

  var promise = Promise.resolve();

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

  return promise
    .return(data)
    .get('query')
    .call('fetchAll')
    .get('models');
}

function paginate(data) {

  _.extend(data, pagination.setUpPagination(data.req, data.res));

  return Promise
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
  if (!data.filter) {
    pagination.setPaginationFilteredTotal(data.res, data.total);
    return;
  }

  return Promise.resolve(data.filter(data.query)).then(function(result) {
    if (result && result.query) {
      data.query = result.query;
      return countFilteredTotal(data);
    } else {
      pagination.setPaginationFilteredTotal(data.res, data.total);
    }
  });
}

function applySorting(data) {
  if (!data.sorts) {
    return;
  }

  var orderBy = data.req.query.sort;
  if (!orderBy) {
    return;
  }

  var direction = 'ASC';
  if (orderBy.match(/-desc$/i)) {
    direction = 'DESC';
    orderBy = orderBy.replace(/-desc$/i, '');
  }

  if (!data.sorts[orderBy]) {
    return;
  }

  data.query = data.sorts[orderBy](data.query, direction);
}
