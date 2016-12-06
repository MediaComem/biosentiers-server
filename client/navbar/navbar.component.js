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
   * Controls the navbar, mostly login/logout and the user profile link.
   */
  function BioNavbarCtrl(BioAuth, BioEvents, BioModals) {

    var navbarCtrl = this;

    navbarCtrl.collapsed = true;
    navbarCtrl.openLoginModal = openLoginModal;
    navbarCtrl.logOut = BioAuth.logOut;
    navbarCtrl.hasRole = BioAuth.hasRole;

    // Keep track of the logged user so the profile link can be displayed (or removed).
    BioEvents.attach(BioAuth.userObs, navbarCtrl, 'user');

    function openLoginModal() {
      return BioModals.open({
        component: 'bioLoginModal'
      });
    }
  }
})();
