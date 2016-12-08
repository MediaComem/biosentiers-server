var _ = require('lodash'),
    Promise = require('bluebird');

exports.setUpPagination = setUpPagination;
exports.setPaginationTotal = setPaginationTotal;
exports.setPaginationFilteredTotal = setPaginationFilteredTotal;

function setPaginationTotal(res, count) {
  res.set('Pagination-Total', count);
}

function setPaginationFilteredTotal(res, count) {
  res.set('Pagination-Filtered', count);
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
