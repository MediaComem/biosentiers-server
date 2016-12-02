(function() {
  'use strict';

  angular
    .module('bio')
    .config(defineRoutes);

  function defineRoutes($locationProvider, $stateProvider, $urlRouterProvider) {

    $locationProvider.html5Mode(true);

    $stateProvider

      .state('home', {
        url: '^/',
        controller: 'BioHomePageCtrl',
        controllerAs: 'homePageCtrl',
        templateUrl: '/assets/home-page/home-page.html'
      })

      .state('register', {
        url: '^/register?invitation',
        controller: 'BioRegistrationPageCtrl',
        controllerAs: 'registrationPageCtrl',
        templateUrl: '/assets/auth/registration-page/registration-page.html'
      })

      .state('admin', {
        url: '^/admin',
        abstract: true,
        template: '<div ui-view></div>'
      })

      .state('admin.users', {
        url: '/users',
        controller: 'BioUsersPageCtrl',
        controllerAs: 'usersPageCtrl',
        templateUrl: '/assets/users-page/users-page.html'
      })

    ;

    $urlRouterProvider.otherwise(function($injector) {
      $injector.get('$state').go('home');
    });
  }
})();
