(function() {
  'use strict';

  angular
    .module('bio.auth')
    .factory('BioAuthRouting', BioAuthRoutingService);

  /**
   * This service uses the BioAuth service to ensure that users are
   * authorized to access the application's pages.
   *
   * It also automatically redirects the user to an accessible page
   * when logging out on a protected page.
   */
  function BioAuthRoutingService(BioAuth, $log, $state, $transitions) {

    // Keep track of the current router state.
    var currentState;

    // This is the router state to which users will be redirected if logging out
    // when on a page that requires authorization.
    var defaultRedirectState = 'home';

    var service = {};

    service.initialize = initialize;

    return service;

    /**
     * Plugs into relevant events.
     */
    function initialize() {

      // Check every router state transition. Redirect the user to an
      // accessible page when trying to access a protected page without
      // proper authorization.
      $transitions.onStart({}, function($transition$) {
        var to = $transition$.$to();
        if (!isStateAuthorized(to)) {
          return $state.target(getUnauthorizedRedirectState(to));
        }
      });

      // Save the new router state on successful transitions.
      $transitions.onSuccess({}, function($transition$) {
        currentState = $transition$.$to();
      });

      // Redirect the user if after logging out he no longer has proper
      // authorization to access the current page.
      BioAuth.userObs.subscribe(function(user) {
        if (!user && !isStateAuthorized(currentState)) {
          $state.go(getUnauthorizedRedirectState(state));
        }
      });
    }

    /**
     * Assuming that the user doesn't have access to the specified state,
     * this function returns the name of the state to which the user should be
     * redirected.
     *
     * The result is either the `redirectUnauthorizedTo` property of the state's data.
     * or the default redirect state.
     *
     * @param {uiRouter.State} state - The protected router state from which to redirect.
     * @returns {String} The name of the router state to redirect the user to.
     */
    function getUnauthorizedRedirectState(state) {
      var redirectTo = _.get(state, 'data.redirectUnauthorizedTo', defaultRedirectState);
      $log.debug('Redirecting unauthorized user to ' + redirectTo);
      return redirectTo;
    }

    /**
     * Returns true if the current user is authorized to the specified state.
     *
     * @param {uiRouter.State} state - The state to check.
     * @returns {Boolean}
     */
    function isStateAuthorized(state) {
      var requiredRole = _.get(state, 'data.requiredRole');
      return !requiredRole || BioAuth.hasRole(requiredRole);
    }
  }
})();
