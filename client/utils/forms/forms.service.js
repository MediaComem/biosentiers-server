(function() {
  'use strict';

  angular
    .module('bio.forms')
    .factory('BioForms', BioFormsService);

  /**
   * Utilities to manage forms.
   */
  function BioFormsService() {

    var service = {
      debounceNgModelController: debounceNgModelController
    };

    return service;

    /**
     * Configures the controller of an ng-model directive to debounce updates to the value.
     * Use this for asynchronous API validations to avoid triggering too many updates while the user is typing.
     *
     * @param {Object} options - Debounce options.
     * @param {Number} options.delay - Time to wait before validating the value when the user finishes typing (500ms by default).
     */
    function debounceNgModelController(ctrl, options) {
      options = _.extend({}, options);

      var delay = _.isNumber(options.delay) ? options.delay : 500;

      if (!ctrl.$options) {
        ctrl.$options = {};
      }

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
