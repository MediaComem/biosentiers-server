(function() {
  'use strict';

  angular
    .module('bio.tables')
    .controller('BioTableCtrl', BioTableCtrl)
    .component('bioTable', {
      transclude: true,
      controller: 'BioTableCtrl',
      controllerAs: 'tableCtrl',
      templateUrl: '/assets/utils/tables/tables.table.html',
      bindings: {
        table: '=',
        tableOptions: '<'
      }
    });

  function BioTableCtrl(BioApi, $element) {

    var tableCtrl = this;

    var previousParams;

    var options = _.extend({}, tableCtrl.tableOptions);
    if (!options.url) {
      throw new Error('Table requires an URL to call for data');
    }

    tableCtrl.table = {
      initialized: false,
      records: options.records || []
    };

    tableCtrl.url = options.url;
    tableCtrl.params = _.extend({}, options.params);
    tableCtrl.pageSize = options.pageSize || 15;
    tableCtrl.defaultSort = options.defaultSort;
    tableCtrl.defaultSortReversed = options.defaultSortReversed;

    tableCtrl.refresh = refreshTable;

    this.$postLink = function() {
      tableCtrl.table.colspan = $element.find('table thead tr th').length;
    };

    function refreshTable(smartTable) {

      smartTable.pagination.start = smartTable.pagination.start || 0;
      smartTable.pagination.number = smartTable.pagination.number || tableCtrl.pageSize;

      if (tableCtrl.defaultSort && !_.get(smartTable, 'sort.predicate')) {
        smartTable.sort = {
          predicate: tableCtrl.defaultSort,
          reverse: tableCtrl.defaultSortReversed
        };
      }

      var params = _.extend({}, tableCtrl.params, {
        offset: smartTable.pagination.start,
        limit: smartTable.pagination.number
      });

      var sort = smartTable.sort.predicate;
      if (sort) {
        params.sort = sort;

        if (smartTable.sort.reverse) {
          params.sort = params.sort + '-desc';
        }
      }

      if (angular.equals(params, previousParams)) {
        return;
      }

      previousParams = params;

      Promise
        .resolve(params)
        .then(fetchPage)
        .then(_.partial(updatePagination, smartTable))
        .then(updateRecords);
    }

    function fetchPage(params) {
      return BioApi({
        url: tableCtrl.url,
        params: params
      });
    }

    function updatePagination(smartTable, res) {

      var pagination = res.pagination();
      tableCtrl.table.total = pagination.total;
      tableCtrl.table.filteredTotal = pagination.filteredTotal;

      smartTable.pagination.numberOfPages = pagination.numberOfPages;

      return res;
    }

    function updateRecords(res) {
      tableCtrl.table.records = res.data;
      tableCtrl.table.initialized = true;
    }
  }
})();
