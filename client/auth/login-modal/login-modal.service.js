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
      open: openModal
    };

    return service;

    /**
     * Opens the login modal dialog.
     */
    function openModal() {
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
  function BioLoginModalCtrl(BioAuth, $uibModalInstance) {

    var loginModalCtrl = this;

    loginModalCtrl.user = {};
    loginModalCtrl.login = login;

    function login() {
      BioAuth
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
