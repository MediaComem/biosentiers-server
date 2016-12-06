(function() {
  'use strict';

  angular
    .module('bio.auth')
    .factory('BioAuth', BioAuthService);

  /**
   * Authentication service to manage the logged user and API token.
   *
   * The auth data returned by the server when the user logs in is
   * stored in the browser's local storage.
   */
  function BioAuthService(BioStorage, $http, $log, rx, $state, $transitions) {

    // RXJS behavior subject (keeps the last published value) to allow
    // other services and components to react when the user logs in or out.
    var userSubject = new rx.BehaviorSubject();

    var service = {

      // The logged in user.
      user: null,
      // An RXJS read-only observable of the logged in user.
      userObs: userSubject.asObservable(),
      // The user's API authentication token.
      apiToken: null,
      // Available user roles.
      roles: [ 'user', 'admin' ],

      // Methods
      initialize: initialize,
      logIn: authenticate,
      logOut: unsetAuthData,
      hasRole: loggedUserHasRole
    };

    return service;

    /**
     * Loads authentication data from local storage (if any);
     */
    function initialize() {
      var authData = BioStorage.get('auth');
      if (authData) {
        setAuthData(authData);
      }
    }

    /**
     * Authenticates the user to the server.
     *
     * @param {Object} credentials
     * @param {String} credentials.email - The user's e-mail address.
     * @param {String} credentials.password - The user's password.
     * @returns {Promise} A promise that will be resolved with the logged in user, or rejected with the failed HTTP response.
     */
    function authenticate(credentials) {
      return $http({
        method: 'POST',
        url: '/api/auth',
        data: credentials
      }).then(function(res) {
        setAuthData(res.data);
        return res.data.user;
      });
    }

    /**
     * Attaches the current authentication data to the service and stores it into the browser's local storage.
     *
     * This will trigger an update of the user's RXJS observable.
     *
     * @param {Object} authData
     * @param {Object} authData.user - The logged in user.
     * @param {Object} authData.token - The user's API authentication token.
     */
    function setAuthData(authData) {

      service.user = authData.user;
      service.apiToken = authData.token;

      BioStorage.set('auth', authData);
      userSubject.onNext(service.user);

      $log.debug('Logged in as ' + service.user.email);
    }

    /**
     * Unsets the current authentication data and removes it from the browser's local storage.
     *
     * This will trigger an update of the user's RXJS observable.
     */
    function unsetAuthData() {

      var user = service.user;
      delete service.user;
      delete service.apiToken;

      BioStorage.remove('auth');
      userSubject.onNext(null);

      $log.debug(user.email + ' logged out');
    }

    /**
     * Returns true if a user is logged in who has the specified role.
     */
    function loggedUserHasRole(role) {
      return role && service.user && service.user.role === role;
    }
  }
})();
