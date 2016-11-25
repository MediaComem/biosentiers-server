(function() {
  'use strict';

  /**
   * The application's navbar (always displayed at the top of the page).
   */
  angular
    .module('bio.navbar')
    .controller('BioNavbarCtrl', BioNavbarCtrl)
    .component('bioNavbar', {
      controller: 'BioNavbarCtrl',
      controllerAs: 'navbarCtrl',
      templateUrl: '/assets/navbar/navbar.html'
    });

  /**
   * Controls the navbar, mostly the login/logout and user profile links.
   */
  function BioNavbarCtrl(Auth, BioLoginModal) {

    var navbarCtrl = this;

    navbarCtrl.collapsed = true;
    navbarCtrl.openLoginModal = BioLoginModal.open;
    navbarCtrl.logOut = Auth.logOut;

    Auth.userObs.subscribe(updateUser);

    function updateUser(user) {
      navbarCtrl.user = user;
    }
  }
})();
