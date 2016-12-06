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

    // User roles determining their privileges within the application.
    // IMPORTANT: roles are ordered by increasing privileges, so a user
    // with the "admin" role implicitly has the "user" role.
    var userRoles = [ 'user', 'admin' ];

    var service = {

      // The logged in user.
      user: null,
      // An RXJS read-only observable of the logged in user.
      userObs: userSubject.asObservable(),
      // The user's API authentication token.
      apiToken: null,
      // Available user roles.
      roles: userRoles.slice(),

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
        applyAuthData(authData);
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
        saveAuthData(res.data);
        return res.data.user;
      });
    }

    /**
     * Attaches the specified authentication data to the service.
     *
     * This will trigger an update of the user's RXJS observable.
     *
     * @param {Object} authData
     * @param {Object} authData.user - The logged in user.
     * @param {Object} authData.token - The user's API authentication token.
     */
    function applyAuthData(authData) {

      service.user = authData.user;
      service.apiToken = authData.token;

      userSubject.onNext(service.user);

      $log.debug('Logged in as ' + service.user.email);
    }

    /**
     * Calls `applyAuthData` and also saves the authentication data to the browser's local storage.
     *
     * @param {Object} authData
     * @param {Object} authData.user - The logged in user.
     * @param {Object} authData.token - The user's API authentication token.
     */
    function saveAuthData(authData) {
      applyAuthData(authData);
      BioStorage.set('auth', authData);
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
     *
     * This method will return true if the user has a role with greater
     * privileges than the specified role (e.g. a user with the "admin"
     * role implicitly has the "user" role).
     *
     * @param {String} role - The required role.
     * @returns {Boolean}
     */
    function loggedUserHasRole(role) {
      if (!role || !service.user) {
        // No role was given or no user is logged in.
        return false;
      } else if (service.user.role === role) {
        // The logged user has the specified role.
        return true;
      }

      var roleIndex = userRoles.indexOf(role),
          userRoleIndex = userRoles.indexOf(service.user.role);

      if (roleIndex < 0 || userRoleIndex < 0) {
        // The specified role or the role of the logged user are unknown.
        return false;
      }

      // The logged user is considered to have the specified role
      // because if it has a role with greater privileges.
      return userRoleIndex > roleIndex;
    }
  }
})();
