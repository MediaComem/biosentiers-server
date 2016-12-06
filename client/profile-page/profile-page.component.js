(function() {
  'use strict';

  /**
   * The profile page where a user can see information about his account.
   */
  angular
    .module('bio.profile-page')
    .controller('BioProfilePageCtrl', BioProfilePageCtrl)
    .component('bioProfilePage', {
      controller: 'BioProfilePageCtrl',
      controllerAs: 'profilePageCtrl',
      templateUrl: '/assets/profile-page/profile-page.html'
    });

  function BioProfilePageCtrl(BioAuth) {

    var profilePageCtrl = this;

    profilePageCtrl.user = BioAuth.user;
    profilePageCtrl.hasRole = BioAuth.hasRole;
  }
})();
