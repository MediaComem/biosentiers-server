(function() {
  'use strict';

  /**
   * The registration page is where invited users arrive by following the link
   * they received via e-mail. The link contains a bearer token which authorizes
   * the creation of a new user account.
   */
  angular
    .module('bio.auth.registration-page')
    .controller('BioRegistrationPageCtrl', BioRegistrationPageCtrl)
    .component('bioRegistrationPage', {
      controller: 'BioRegistrationPageCtrl',
      controllerAs: 'registrationPageCtrl',
      templateUrl: '/assets/auth/registration-page/registration-page.html'
    });

  /**
   * Controls the registration form.
   *
   * The following errors can be displayed on the page:
   *
   * * If the link's token is expired or is invalid.
   * * If the user is already logged in.
   */
  function BioRegistrationPageCtrl(BioApi, BioAuth, BioEvents, $state, $stateParams) {

    var registrationPageCtrl = this;

    registrationPageCtrl.user = {};
    registrationPageCtrl.register = register;

    // Check if the user is already logged in (to hide the registration form).
    BioEvents.attach(BioAuth.userObs, registrationPageCtrl, 'existingUser');

    // Retrieve the invitation with the link's token.
    retrieveInvitation();

    /**
     * Retrieves the invitation corresponding to the token in the address.
     */
    function retrieveInvitation() {
      return BioApi({
        url: '/auth/invitation',
        headers: {
          Authorization: 'Bearer ' + $stateParams.invitation
        }
      }).then(function(res) {
        registrationPageCtrl.invitation = res.data;
      }).catch(function(res) {
        registrationPageCtrl.invitationInvalid = true;
      });
    }

    /**
     * Registers the new user account. This is done in several steps:
     *
     * * Create the user account.
     * * Automatically log in.
     * * Redirect to the home page.
     */
    function register() {
      createUser()
        .then(autoLogIn)
        .then(goToHome);
    }

    /**
     * Creates the new user account.
     */
    function createUser() {
      return BioApi({
        method: 'POST',
        url: '/users',
        data: registrationPageCtrl.user,
        headers: {
          Authorization: 'Bearer ' + $stateParams.invitation
        }
      });
    }

    /**
     * Automatically logs in the newly created user.
     */
    function autoLogIn() {
      return BioAuth.logIn({
        email: registrationPageCtrl.invitation.email,
        password: registrationPageCtrl.user.password
      });
    }

    /**
     * Redirects to the home page.
     */
    function goToHome() {
      $state.go('home');
    }
  }
})();
