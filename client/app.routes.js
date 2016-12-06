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
        component: 'bioHomePage'
      })

      .state('register', {
        url: '^/register?invitation',
        component: 'bioRegistrationPage'
      })

      .state('admin', {
        url: '^/admin',
        abstract: true,
        template: '<div ui-view></div>',
        data: {
          requiredRole: 'admin'
        }
      })

      .state('admin.users', {
        url: '/users',
        component: 'bioUsersPage'
      })

    ;

    $urlRouterProvider.otherwise(function($injector) {
      $injector.get('$state').go('home');
    });
  }
})();
