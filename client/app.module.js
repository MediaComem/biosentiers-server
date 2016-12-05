(function() {
  'use strict';

  angular.module('bio', [
    // Angular modules
    'ngAnimate',
    'ngSanitize',
    // Third-party dependencies
    'angular-loading-bar',
    'rx',
    'ui.bootstrap',
    'ui.router',
    'ui.select',
    // Application utilities
    'bio.api',
    'bio.auth',
    'bio.events',
    'bio.forms',
    // Application content
    'bio.auth.registration-page',
    'bio.home-page',
    'bio.navbar',
    'bio.users-page'
  ]);
})();
