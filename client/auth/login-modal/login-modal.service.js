(function() {
  'use strict';

  angular
    .module('bio.auth.login-modal')
    .factory('BioLoginModal', BioLoginModalService)
    .controller('BioLoginModalCtrl', BioLoginModalCtrl);

  /**
   * Service to manage the login modal.
   */
  function BioLoginModalService($uibModal) {

    var service = {
      open: openLoginModal
    };

    return service;

    /**
     * Opens the login modal dialog.
     */
    function openLoginModal() {
      return $uibModal.open({
        controller: 'BioLoginModalCtrl',
        controllerAs: 'loginModalCtrl',
        templateUrl: '/assets/auth/login-modal/login-modal.html'
      });
    }
  }

  /**
   * Controls the login form.
   *
   * Authentication is delegated to the Auth service.
   * The modal closes automatically on a successful login.
   */
  function BioLoginModalCtrl(Auth, $uibModalInstance) {

    var loginModalCtrl = this;

    loginModalCtrl.user = {};
    loginModalCtrl.login = login;

    function login() {
      Auth
        .logIn(loginModalCtrl.user)
        .then(closeModal)
        .catch(handleError);
    }

    function closeModal(result) {
      $uibModalInstance.close(result);
    }

    function handleError(err) {
      loginModalCtrl.apiError = err;
    }
  }
})();
