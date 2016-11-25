(function() {
  'use strict';

  angular.module('bio', [
    // Angular modules
    'ngAnimate',
    // Third-party dependencies
    'rx',
    'ui.bootstrap',
    'ui.router',
    // Application modules
    'bio.auth',
    'bio.forms',
    'bio.home',
    'bio.navbar'
  ]);
})();
