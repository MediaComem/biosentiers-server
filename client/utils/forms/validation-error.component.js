(function() {
  'use strict';

  /**
   * Component to display form validation errors conditionally.
   *
   * <validation-error for="myForm.myField" validation="required">My field is required</validation-error>
   */
  angular
    .module('bio.forms')
    .controller('BioValidationErrorCtrl', BioValidationErrorCtrl)
    .component('validationError', {
      controller: 'BioValidationErrorCtrl',
      controllerAs: 'errorCtrl',
      transclude: true,
      template: '<span ng-if="!errorCtrl.valid" class="help-block"><span class="text-danger"><ng-transclude></ng-transclude></span></span>',
      bindings: {
        for: '<',
        validation: '@'
      }
    });

  /**
   * Controls the display of the validation error depending on whether the field is actually invalid.
   */
  function BioValidationErrorCtrl($scope) {

    var errorCtrl = this;

    $scope.$watch(function() {

      // The field is valid if not yet available or if it has not yet been modified (i.e. not dirty).
      if (!errorCtrl.for || !errorCtrl.for.$dirty) {
        return true;
      }

      // Otherwise:
      //
      // * If a specific validation was supplied, the field is valid if there is no error for that validation.
      // * If no specific validation was supplied, the field is valid if all its validations pass.
      var validation = errorCtrl.validation;
      return validation ? !errorCtrl.for.$error[validation] : errorCtrl.for.$valid;
    }, function(valid) {
      // Update the validation state.
      errorCtrl.valid = valid;
    });
  }
})();
