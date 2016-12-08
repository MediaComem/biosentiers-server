(function() {
  'use strict';

  angular
    .module('bio.tables')
    .directive('bioTableFilters', defineBioTableFiltersDirective);

  function defineBioTableFiltersDirective() {
    return {
      restrict: 'AE',
      require: '^stTable',
      scope: {
        stFilters: '='
      },
      link: function(scope, element, attrs, ctrl) {

        var firstTime = true;

        scope.$watch('stFilters', function() {
          if (firstTime) {
            firstTime = false;
            return;
          }

          ctrl.pipe();
        }, true);
      }
    };
  }
})();
