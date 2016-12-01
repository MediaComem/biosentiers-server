var _ = require('lodash'),
    Promise = require('bluebird');

module.exports = function(req, res, baseQuery, filter) {

  // Use a wrapper to hold Mongoose queries and avoid problems with promises.
  // (Queries are promises themselves so returning them from a promise will resolve them.)
  var wrapper = {
    query: baseQuery
  };

  function countTotal() {
    return wrapper.query.clone().count().then(function(count) {
      setPaginationTotal(res, count);
    });
  }

  function countFilteredTotal(filteredQuery) {
    return filteredQuery.clone().count().then(function(count) {
      setPaginationFilteredTotal(res, count);
    });
  }

  function applyPagination() {
    var data = setUpPagination(req, res);
    return wrapper.query.query(function(queryBuilder) {
      queryBuilder.offset(data.offset).limit(data.limit);
    }).fetchAll();
  }

  function checkFiltered() {
    if (!filter) {
      setPaginationFilteredTotal(res, 0);
      return;
    }

    return Promise.resolve(filter(baseQuery)).then(function(result) {
      if (result && result.query) {
        wrapper.query = result.query;
        return countFilteredTotal(result.query);
      }
    });
  }

  return Promise.resolve().then(countTotal).then(checkFiltered).then(applyPagination);
};

module.exports.setUpPagination = setUpPagination;
module.exports.setPaginationTotal = setPaginationTotal;
module.exports.setPaginationFilteredTotal = setPaginationFilteredTotal;

function setPaginationTotal(res, count) {
  res.set('Pagination-Total', count);
}

function setPaginationFilteredTotal(res, count) {
  res.set('Pagination-Filtered-Total', count);
}

function setUpPagination(req, res) {

  var offset = req.query.offset,
      limit = req.query.limit;

  offset = parseInt(offset, 10);
  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  limit = parseInt(limit, 10);
  if (isNaN(limit) || limit < 0 || limit > 250) {
    limit = 100;
  }

  res.set('Pagination-Offset', offset);
  res.set('Pagination-Limit', limit);

  return {
    offset: offset,
    limit: limit
  };
};
