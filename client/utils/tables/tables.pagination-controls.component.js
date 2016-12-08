(function() {
  'use strict';

  angular
    .module('bio.tables')
    .controller('BioPaginationCtrl', BioPaginationCtrl)
    .component('bioPagination', {
      controller: 'BioPaginationCtrl',
      controllerAs: 'paginationCtrl',
      templateUrl: '/assets/utils/tables/tables.pagination-controls.html',
      bindings: {
        currentPage: '<',
        numberOfPages: '<',
        onSelectPage: '&'
      }
    });

  function BioPaginationCtrl($scope) {

    var paginationCtrl = this;

    paginationCtrl.directPageLinks = [];

    paginationCtrl.selectPage = selectPage;

    $scope.$watchGroup([ 'paginationCtrl.currentPage', 'paginationCtrl.numberOfPages' ], function(values) {

      var currentPage = values[0],
          numPages = values[1];

      if (numPages == 1) {
        paginationCtrl.directPageLinks = [ 1 ];
      } if (numPages == 2) {
        paginationCtrl.directPageLinks = [ 1, 2 ];
      } else if (numPages && numPages >= 3 && currentPage) {
        if (currentPage == 1) {
          paginationCtrl.directPageLinks = [ 1, 2, 3 ];
        } else if (currentPage == numPages) {
          paginationCtrl.directPageLinks = _.times(3, function(i) {
            return currentPage - 2 + i;
          });
        } else {
          paginationCtrl.directPageLinks = _.times(3, function(i) {
            return currentPage - 1 + i;
          });
        }
      }
    });

    function selectPage(n) {
      paginationCtrl.onSelectPage({
        n: n
      });
    }
  }
})();
