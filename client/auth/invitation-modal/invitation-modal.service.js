(function() {
  'use strict';

  angular
    .module('bio.auth.invitation-modal')
    .factory('BioInvitationModal', BioInvitationModalService)
    .controller('BioInvitationModalCtrl', BioInvitationModalCtrl)
    .component('bioInvitationModal', {
      controller: 'BioInvitationModalCtrl',
      controllerAs: 'invitationModalCtrl',
      templateUrl: '/assets/auth/invitation-modal/invitation-modal.html',
      bindings: {
        close: '&',
        dismiss: '&',
        modalInstance: '<'
      }
    });

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
        component: 'bioInvitationModal'
      });
    }
  }

  /**
   * Controls the invitation form.
   */
  function BioInvitationModalCtrl(BioAuth, BioApi) {

    var invitationModalCtrl = this;

    invitationModalCtrl.user = {
      role: BioAuth.roles[0]
    };

    invitationModalCtrl.userRoles = BioAuth.roles;
    invitationModalCtrl.invite = invite;

    function invite() {

      delete invitationModalCtrl.apiError;

      return BioApi({
        method: 'POST',
        url: '/auth/invitation',
        data: invitationModalCtrl.user
      })
        .then(closeModal)
        .catch(handleError);
    }

    function closeModal(result) {
      invitationModalCtrl.modalInstance.close({
        $value: result
      });
    }

    function handleError(err) {
      invitationModalCtrl.apiError = err;
    }
  }
})();
