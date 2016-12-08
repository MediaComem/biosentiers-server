(function() {
  'use strict';

  angular
    .module('bio.tables')
    .directive('autoColspan', defineAutoColspanDirective);

  function defineAutoColspanDirective() {
    return {
      restrict: 'A',
      require: '^bioTable',
      link: function(scope, element, attrs, ctrl) {
        scope.$watch(function() {
          return ctrl.table.colspan;
        }, function(value) {
          if (value) {
            $(element).attr('colspan', value);
          }
        });
      }
    };
  }
})();
