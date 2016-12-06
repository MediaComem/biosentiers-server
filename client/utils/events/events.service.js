(function() {
  'use strict';

  /**
   * A service to simplify working with events and RxJS observables.
   */
  angular
    .module('bio.events')
    .factory('BioEvents', BioEventsService);

  function BioEventsService() {

    var service = {
      attach: attach
    };

    return service;

    /**
     * Subscribes to the specified observable and attaches published values
     * to the specified target object property.
     *
     * The target should be an Angular Scope or the controller of an Angular component.
     * That way, the subscription will automatically be canceled when the scope or
     * component is destroyed.
     *
     * @param {rx.Observable} observable - The observable to subscribe to.
     * @param {Object} target - The scope or controller to attach published values to.
     * @param {String,Function} property - The property of the target to attach published values to,
     *                                     or a function that will be called with the target and value
     *                                     when a new value is published.
     */
    function attach(observable, target, property) {
      if (!target) {
        throw new Error('A target scope or component is required');
      }

      var attach = property;

      // If property is a string,transform it into a function to
      // attach the value to that property of the target.
      if (!_.isFunction(property)) {
        attach = function(target, value) {
          target[property] = value;
        };
      }

      // Subscribe to the observable and make sure to call the attach
      // function with both the target and the value.
      var subscription = observable.subscribe(_.partial(attach, target));

      if (_.isFunction(target.$on)) {
        // If the target is a scope, unsubscribe when the $destroy event occurs.
        target.$on('$destroy', unsubscriber(subscription));
      } else {
        // If the target is a component controller, unsubscribe when the $onDestroy
        // hook is called.
        onComponentDestroy(target, unsubscriber(subscription));
      }
    }

    /**
     * Adds an $onDestroy hook to the controller of an Angular component.
     *
     * If the component already had an $onDestroy hook, it is executed first,
     * then the new hook is executed.
     */
    function onComponentDestroy(componentCtrl, callback) {
      var previousCallback = componentCtrl.$onDestroy || _.noop;
      componentCtrl.$onDestroy = function() {
        previousCallback.apply(undefined, arguments);
        callback.apply(undefined, arguments);
      };
    }

    /**
     * Returns a function that will cancel the specified subscription when called.
     */
    function unsubscriber(subscription) {
      return function() {
        subscription.dispose();
      };
    }
  }
})();
