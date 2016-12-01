(function() {
  'use strict';

  angular
    .module('bio')
    .config(initialize);

  /**
   * Initializes the authentication service when the app starts,
   * e.g. to load the logged in user from local storage.
   */
  function initialize(uiSelectConfig) {
    uiSelectConfig.theme = 'bootstrap';
    uiSelectConfig.resetSearchInput = true;
  }
})();
