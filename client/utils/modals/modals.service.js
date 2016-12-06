(function() {
  'use strict';

  /**
   * Service to help working with modal dialogs.
   */
  angular
    .module('bio.modals')
    .factory('BioModals', BioModalsService);

  function BioModalsService($uibModal) {

    var service = {
      open: openModal
    };

    return service;

    /**
     * Opens a modal dialog with the specified options.
     *
     * @param {Object} options
     * @param {String} options.component - The Angular component to display in the modal dialog.
     */
    function openModal(options) {
      options = _.extend({}, options);

      // Require either a component or a controller.
      if (!options.component && !options.controller) {
        throw new Error('A modal component or controller is required');
      }

      return $uibModal.open(options);
    }
  }
})();
