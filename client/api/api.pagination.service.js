(function() {
  'use strict';

  angular
    .module('bio.api')
    .factory('BioApiPagination', BioApiPaginationService);

  function BioApiPaginationService($log) {

    var service = {
      parse: parseApiPaginationDataFromResponse
    };

    return service;

    function parseApiPaginationDataFromResponse(res) {

      var pagination = {
        offset: parsePaginationHeader(res, 'Pagination-Offset', true),
        limit: parsePaginationHeader(res, 'Pagination-Limit', true),
        total: parsePaginationHeader(res, 'Pagination-Total', true),
        filteredTotal: parsePaginationHeader(res, 'Pagination-Filtered', false)
      };

      var total = pagination.filteredTotal !== undefined ? pagination.filteredTotal : pagination.total;
      pagination.numberOfPages = Math.ceil(total / pagination.limit);
      pagination.hasMorePages = pagination.offset + pagination.limit < total;
      pagination.effectiveTotal = total;

      return pagination;
    }

    function parsePaginationHeader(res, header, required) {

      var value = res.headers(header);
      if (!value) {
        if (required) {
          throw new Error('Exected response to have the ' + header + ' header');
        } else {
          return undefined;
        }
      }

      var number = parseInt(value, 10);
      if (isNaN(number)) {
        throw new Error('Expected response header ' + header + ' to contain an integer, got "' + value + '" (' + typeof(value) + ')');
      }

      return number;
    }
  }
})();
