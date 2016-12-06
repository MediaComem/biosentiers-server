(function() {
  'use strict';

  /**
   * Utilities to enrich forms.
   */
  angular
    .module('bio.forms')
    .factory('BioForms', BioFormsService);

  function BioFormsService(BioApi, $q) {

    var service = {
      validateUniqueness: validateUniqueness,
      debounceNgModelController: debounceNgModelController
    };

    return service;

    /**
     * Performs an API call with the specified options and returns a promise
     * that will be resolved if no matching record is found, or that will be
     * rejected otherwise. This can be used to check whether a value is
     * already taken in the database.
     *
     * Blank values are considered not be subject to uniqueness errors.
     * If the specified value is blank, the API call is not performed and a
     * resolved promise is returned.
     *
     * If an ID to ignore is specified, the promise will be resolved if the
     * API call finds one matching element with that ID (presumably it is the
     * same object as the one being validated, so it cannot cause a uniqueness
     * error due to itself).
     *
     * @param {String} value - The value to validate.
     * @param {Object} apiOptions - Options to be passed to the BioApi service.
     * @param {String} ignoreId - An API resource ID to ignore if found.
     */
    function validateUniqueness(value, apiOptions, ignoreId) {

      // If the value is blank then it is considered valid
      // (use the "required" validation if necessary).
      if (!value || _.isEmpty(value.trim())) {
        return $q.when();
      }

      // Call the API with the supplied options to check for uniqueness.
      return BioApi(apiOptions).then(function(res) {
        // The value is valid if no matching record is found or
        // if the record found is the one being checked.
        if (!res.data.length || (ignoreId && res.data[0].id === ignoreId)) {
          return $q.when();
        } else {
          return $q.reject();
        }
      }, function() {
        // Consider the value valid if uniqueness cannot be verified.
        return $q.when();
      });
    }

    /**
     * Configures the controller of an ng-model directive to debounce updates to the value.
     * Use this for asynchronous API validations to avoid triggering too many updates while the user is typing.
     *
     * @param {Object} options - Debounce options.
     * @param {Number} options.delay - Time to wait before validating the value when the user finishes typing (500ms by default).
     */
    function debounceNgModelController(ctrl, options) {
      options = _.extend({}, options);

      // Default to 500ms.
      var delay = _.isNumber(options.delay) ? options.delay : 500;

      if (!ctrl.$options) {
        ctrl.$options = {};
      }

      // Set the options.
      _.extend(ctrl.$options, {
        updateOn: 'blur',
        updateOnDefault: true,
        debounce: {
          blur: 0,
          default: delay
        }
      });
    }
  }
})();
