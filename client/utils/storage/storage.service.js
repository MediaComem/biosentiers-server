(function() {
  'use strict';

  angular
    .module('bio.storage')
    .factory('BioStorage', BioStorageService);

  /**
   * Namespaced local storage for the application.
   *
   *     BioStorage.get('foo'); // => value of "biosentiers.foo" in local storage
   */
  function BioStorageService(store) {
    return store.getNamespacedStore('biosentiers');
  }
})();
