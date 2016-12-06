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
  function uniqueUserEmailDirective(BioForms) {
    return {
      require: 'ngModel',
      link: function($scope, element, attrs, ctrl) {

        // Debounce updates to avoid too many requests being sent to the API.
        BioForms.debounceNgModelController(ctrl);

        ctrl.$asyncValidators.uniqueUserEmail = function(modelValue) {
          return BioForms.validateUniqueness(modelValue, {
            url: '/users',
            params: {
              email: modelValue,
              limit: 1
            }
          }, attrs.uniqueUserId);
        };
      }
    };
  }
})();
