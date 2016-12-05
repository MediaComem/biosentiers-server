(function() {
  'use strict';

  angular
    .module('bio.auth.login-modal')
    .factory('BioLoginModal', BioLoginModalService)
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
        component: 'bioLoginModal'
      });
    }
  }

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

    function login() {
      BioAuth
        .logIn(loginModalCtrl.user)
        .then(closeModal)
        .catch(handleError);
    }

    function closeModal(result) {
      loginModalCtrl.modalInstance.close({
        $value: result
      });
    }

    function handleError(err) {
      loginModalCtrl.apiError = err;
    }
  }
})();
