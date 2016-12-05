(function() {
  'use strict';

  angular
    .module('bio.users-page')
    .controller('BioUsersPageCtrl', BioUsersPageCtrl)
    .component('bioUsersPage', {
      controller: 'BioUsersPageCtrl',
      controllerAs: 'usersPageCtrl',
      templateUrl: '/assets/users-page/users-page.html'
    });

  function BioUsersPageCtrl(BioInvitationModal) {

    var usersPageCtrl = this;

    usersPageCtrl.openInvitationModal = BioInvitationModal.open;
  }
})();
