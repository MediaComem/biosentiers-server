(function() {
  'use strict';

  angular
    .module('bio.auth.invitation-modal')
    .factory('BioInvitationModal', BioInvitationModalService)
    .controller('BioInvitationModalCtrl', BioInvitationModalCtrl);

  /**
   * Service to manage the invitation modal.
   */
  function BioInvitationModalService($uibModal) {

    var service = {
      open: openModal
    };

    return service;

    /**
     * Opens the invitation modal dialog.
     */
    function openModal() {
      return $uibModal.open({
        controller: 'BioInvitationModalCtrl',
        controllerAs: 'invitationModalCtrl',
        templateUrl: '/assets/auth/invitation-modal/invitation-modal.html'
      });
    }
  }

  /**
   * Controls the invitation form.
   */
  function BioInvitationModalCtrl(BioAuth, BioApi, $uibModalInstance) {

    var invitationModalCtrl = this;

    invitationModalCtrl.user = {
      role: BioAuth.roles[0]
    };

    invitationModalCtrl.userRoles = BioAuth.roles;
    invitationModalCtrl.invite = invite;

    function invite() {

      delete invitationModalCtrl.apiError;

      BioApi({
        method: 'POST',
        url: '/auth/invitation',
        data: invitationModalCtrl.user
      })
        .then(closeModal)
        .catch(handleError);
    }

    function closeModal(result) {
      $uibModalInstance.close(result);
    }

    function handleError(err) {
      invitationModalCtrl.apiError = err;
    }
  }
})();
