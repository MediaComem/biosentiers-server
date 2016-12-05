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
  function BioNavbarCtrl(BioAuth, BioEvents, BioLoginModal) {

    var navbarCtrl = this;

    navbarCtrl.collapsed = true;
    navbarCtrl.openLoginModal = BioLoginModal.open;

    _.extend(navbarCtrl, _.pick(BioAuth, 'logOut', 'hasRole'));

    BioEvents.attach(BioAuth.userObs, navbarCtrl, 'user');
  }
})();
