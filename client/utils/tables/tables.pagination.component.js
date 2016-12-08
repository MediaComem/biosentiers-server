(function() {
  'use strict';

  angular
    .module('bio.tables')
    .component('bioTablePagination', {
      require: {
        tableCtrl: '^bioTable'
      },
      controllerAs: 'tablePaginationCtrl',
      template: '<div st-pagination="true" st-items-by-page="tablePaginationCtrl.tableCtrl.pageSize" st-template="/assets/utils/tables/tables.st-pagination.html"></div>'
    });
})();
