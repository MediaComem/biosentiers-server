exports.setPaginationTotal = function(res, count) {
  res.set('Pagination-Total', count);
};

exports.setPaginationFilteredTotal = function(res, count) {
  res.set('Pagination-Filtered', count);
};

exports.setUpPagination = function(req, res) {

  let offset = req.query.offset;
  let limit = req.query.limit;

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
