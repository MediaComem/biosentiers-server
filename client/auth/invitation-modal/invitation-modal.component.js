(function() {
  'use strict';

  /**
   * The invitation modal is displayed when an administrator wants to invite
   * a new user to create an account. The e-mail address and role of the
   * invited user can be chosen. Submitting the invitation triggers the
   * sending of an e-mail to the selected e-mail address.
   */
  angular
    .module('bio.auth.invitation-modal')
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
   * Controls the modal dialog and the form used to invite new users.
   */
  function BioInvitationModalCtrl(BioAuth, BioApi) {

    var invitationModalCtrl = this;

    invitationModalCtrl.user = {
      role: BioAuth.roles[0]
    };

    invitationModalCtrl.userRoles = BioAuth.roles;
    invitationModalCtrl.invite = invite;

    /**
     * Sends the invitation, closing the modal if it succeeds,
     * or displaying an error otherwise.
     */
    function invite() {

      delete invitationModalCtrl.apiError;

      sendInvitation()
        .then(closeModal)
        .catch(handleError);
    }

    /**
     * Creates the invitation on the server, triggering the
     * sending of an e-mail to the invited user.
     */
    function sendInvitation() {
      return BioApi({
        method: 'POST',
        url: '/auth/invitation',
        data: invitationModalCtrl.user
      });
    }

    /**
     * Closes the modal and provides the invitation object to the caller.
     */
    function closeModal(result) {
      invitationModalCtrl.modalInstance.close({
        $value: result
      });
    }

    /**
     * Attaches any error to the controller so it can be displayed.
     */
    function handleError(err) {
      invitationModalCtrl.apiError = err;
    }
  }
})();
