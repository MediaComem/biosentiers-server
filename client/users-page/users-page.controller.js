(function() {
  'use strict';

  angular
    .module('bio.users-page')
    .controller('BioUsersPageCtrl', BioUsersPageCtrl);

  function BioUsersPageCtrl(BioInvitationModal) {

    var usersPageCtrl = this;

    usersPageCtrl.openInvitationModal = BioInvitationModal.open;
  }
})();
