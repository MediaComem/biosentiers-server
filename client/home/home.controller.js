(function() {
  'use strict';

  angular
    .module('bio.home')
    .controller('BioHomeCtrl', BioHomeCtrl);

  function BioHomeCtrl($scope) {
    $scope.icon = 'star';
  }
})();
