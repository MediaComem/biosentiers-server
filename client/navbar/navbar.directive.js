(function() {
  'use strict';

  angular
    .module('bio.navbar')
    .directive('bioNavbar', bioNavbarDirective)
    .controller('BioNavbarCtrl', BioNavbarCtrl);

  function bioNavbarDirective() {
    return {
      restrict: 'E',
      controller: 'BioNavbarCtrl',
      templateUrl: '/assets/navbar/navbar.html'
    };
  }

  function BioNavbarCtrl() {

  }
})();
