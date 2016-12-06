(function() {
  'use strict';

  /**
   * Namespaced local storage for the application.
   *
   *     BioStorage.get('foo'); // => value of "biosentiers.foo" in local storage
   */
  angular
    .module('bio.storage')
    .factory('BioStorage', BioStorageService);

  function BioStorageService(store) {
    return store.getNamespacedStore('biosentiers');
  }
})();
