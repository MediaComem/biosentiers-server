(function() {
  'use strict';

  angular
    .module('bio.users')
    .directive('uniqueUserEmail', uniqueUserEmailDirective);

  /**
   * Directive to ensure that a user e-mail is not already taken.
   *
   *     <input type='email' ng-model='user.email' unique-user-email />
   *
   * For an existing user, you must also provide the user's API ID:
   *
   *     <input type='email' ng-model='user.email' unique-user-email unique-user-id='{{ user.id }}' />
   */
  function uniqueUserEmailDirective(BioApi, BioForms, $log, $q, $rootScope) {
    return {
      require: 'ngModel',
      link: function($scope, element, attrs, ctrl) {

        BioForms.debounceNgModelController(ctrl);

        ctrl.$asyncValidators.uniqueUserEmail = function(modelValue) {

          // If the name is blank then there can be no name conflict.
          if (!modelValue || _.isEmpty(modelValue.trim())) {
            return $q.when();
          }

          return BioApi({
            url: '/users',
            params: {
              email: modelValue,
              limit: 1
            }
          }).then(function(res) {

            // The value is valid if no record is found or
            // if the record found is the one being modified.
            if (!res.data.length || (attrs.uniqueUserId && res.data[0].id === attrs.uniqueUserId)) {
              return $q.when();
            } else {
              return $q.reject();
            }
          }, function() {
            // consider value valid if uniqueness cannot be verified
            return $q.when();
          });
        };
      }
    };
  }
})();
