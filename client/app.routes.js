(function() {
  'use strict';

  angular
    .module('bio')
    .config(defineRoutes);

  function defineRoutes($locationProvider, $stateProvider, $urlRouterProvider) {

    $locationProvider.html5Mode(true);

    $stateProvider

      .state('home', {
        url: '/',
        controller: 'BioHomeCtrl',
        controllerAs: 'home',
        templateUrl: '/home/home.html'
      })

    ;

    $urlRouterProvider.otherwise(function($injector) {
      $injector.get('$state').go('home');
    });
  }
})();
