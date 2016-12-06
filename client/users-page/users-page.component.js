(function() {
  'use strict';

  /**
   * The users management page for administrators.
   */
  angular
    .module('bio.users-page')
    .controller('BioUsersPageCtrl', BioUsersPageCtrl)
    .component('bioUsersPage', {
      controller: 'BioUsersPageCtrl',
      controllerAs: 'usersPageCtrl',
      templateUrl: '/assets/users-page/users-page.html'
    });

  function BioUsersPageCtrl(BioModals) {

    var usersPageCtrl = this;

    usersPageCtrl.openInvitationModal = openInvitationModal;

    function openInvitationModal() {
      return BioModals.open({
        component: 'bioInvitationModal'
      });
    }
  }
})();
