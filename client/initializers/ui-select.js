(function() {
  'use strict';

  angular
    .module('bio')
    .config(initialize);

  /**
   * Configures the ui-select library.
   */
  function initialize(uiSelectConfig) {
    uiSelectConfig.theme = 'bootstrap';
    uiSelectConfig.resetSearchInput = true;
  }
})();
