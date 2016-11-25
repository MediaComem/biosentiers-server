(function() {
  'use strict';

  angular
    .module('bio.forms')
    .directive('validates', validatesDirective);

  /**
   * Directive to automatically add error classes and tags to a Bootstrap form group.
   *
   * The directive takes the form field as an argument. When the field becomes invalid, the directive:
   *
   * * adds the `has-error` and `has-feedback` classes to the form group;
   * * appends a form control feedback sign to the form group.
   *
   * These changes are reverted when the field becomes valid again.
   *
   * Fields are considered valid if they have not yet been modified.
   */
  function validatesDirective() {
    return {
      restrict: 'A',
      link: linkValidatedDirective,
      scope: {
        validates: '='
      }
    };
  }

  function linkValidatedDirective($scope, $element) {

    var formGroupClasses = 'has-error has-feedback',
        $formControlFeedback = $('<span class="glyphicon glyphicon-warning-sign form-control-feedback" aria-hidden="true" />');

    // Watch the validation state.
    $scope.$watch('validates.$dirty', updateState);
    $scope.$watch('validates.$valid', updateState);

    function updateState() {

      // The field is considered valid if it has not yet been modified (i.e. not dirty)
      // or if all its validations pass.
      var valid = !$scope.validates.$dirty || $scope.validates.$valid;

      // Add or remove the classes/elements depending on the validation state.
      if (valid) {
        $element.removeClass(formGroupClasses);
        $formControlFeedback.remove();
      } else {
        $element.addClass(formGroupClasses);
        $formControlFeedback.appendTo($element);
      }
    }
  }
})();
