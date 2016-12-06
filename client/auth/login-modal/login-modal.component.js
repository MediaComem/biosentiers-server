(function() {
  'use strict';

  /**
   * The login modal is displayed when an anonymous user clicks on the
   * login button in the navbar. It allows the user to log in with an
   * e-mail and password.
   */
  angular
    .module('bio.auth.login-modal')
    .controller('BioLoginModalCtrl', BioLoginModalCtrl)
    .component('bioLoginModal', {
      controller: 'BioLoginModalCtrl',
      controllerAs: 'loginModalCtrl',
      templateUrl: '/assets/auth/login-modal/login-modal.html',
      bindings: {
        close: '&',
        dismiss: '&',
        modalInstance: '<'
      }
    });

  /**
   * Controls the login form.
   *
   * Authentication is delegated to the Auth service.
   * The modal closes automatically on a successful login.
   */
  function BioLoginModalCtrl(BioAuth) {

    var loginModalCtrl = this;

    loginModalCtrl.user = {};
    loginModalCtrl.login = login;

    /**
     * Logs in the user with the credentials supplied in the form,
     * closing the modal if it succeeds, or displaying the error.
     */
    function login() {
      BioAuth
        .logIn(loginModalCtrl.user)
        .then(closeModal)
        .catch(handleError);
    }

    /**
     * Closes the modal and provides the logged in user object to the caller.
     */
    function closeModal(result) {
      loginModalCtrl.modalInstance.close({
        $value: result
      });
    }

    /**
     * Attaches any error to the controller so it can be displayed.
     */
    function handleError(err) {
      loginModalCtrl.apiError = err;
    }
  }
})();
