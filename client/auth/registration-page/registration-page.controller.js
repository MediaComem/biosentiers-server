(function() {
  'use strict';

  angular
    .module('bio.auth.registration-page')
    .controller('BioRegistrationPageCtrl', BioRegistrationPageCtrl);

  function BioRegistrationPageCtrl(BioApi, BioAuth, $state, $stateParams) {

    var registrationPageCtrl = this;

    registrationPageCtrl.user = {};
    registrationPageCtrl.register = register;

    retrieveInvitation();

    function retrieveInvitation() {
      return BioApi({
        url: '/auth/invitation',
        headers: {
          Authorization: 'Bearer ' + $stateParams.invitation
        }
      }).then(function(res) {
        registrationPageCtrl.invitation = res.data;
        _.extend(registrationPageCtrl.user, _.pick(res.data, 'email', 'role'));
      });
    }

    function register() {
      createUser()
        .then(authenticate)
        .then(goToHome);
    }

    function createUser() {
      return BioApi({
        method: 'POST',
        url: '/users',
        data: registrationPageCtrl.user
      });
    }

    function authenticate() {
      return BioAuth.authenticate(_.pick(registrationPageCtrl.user, 'email', 'password'));
    }

    function goToHome() {
      $state.go('home');
    }
  }
})();
