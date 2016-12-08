(function() {
  'use strict';

  angular
    .module('bio.api')
    .factory('BioApi', BioApiService);

  function BioApiService(BioApiPagination, BioAuth, $http, $log, $window) {

    var callNumber = 0;

    var service = performApiCall;

    return service;

    function performApiCall(options) {

      options = _.defaults({}, options, {
        headers: {}
      });

      if (!options.url.match(/^https?:\/\//) && !options.url.match(/^\/\//) && !options.url.match(/^\/api\//)) {
        options.url = join('/api', options.url);
      }

      if (BioAuth.apiToken && !options.headers.Authorization) {
        options.headers.Authorization = 'Bearer ' + BioAuth.apiToken;
      }

      callNumber++;
      logRequest(callNumber, options);

      return $http(options).then(_.partial(handleResponse, _, callNumber));
    }

    function logRequest(callNumber, options) {
      var logMessage = 'API call ' + callNumber + ': ' + (options.method || 'GET') + ' ' + options.url;
      logMessage += (options.params ? '?' + queryString(options.params) : '');
      logMessage += (options.data ? ' ' + JSON.stringify(options.data) : '');
      $log.debug(logMessage);
    }

    function handleResponse(res, callNumber) {
      res.pagination = makePaginationFunction(res, callNumber);
      return res;
    }

    function makePaginationFunction(res, callNumber) {
      return function() {
        if (!res._pagination) {
          res._pagination = BioApiPagination.parse(res);
          $log.debug('API call ' + callNumber + ' pagination: ' + JSON.stringify(res._pagination));
        }

        return res._pagination;
      };
    }

    function join() {

      var url = arguments[0],
          parts = Array.prototype.slice.call(arguments, 1);

      _.each(parts, function(part) {
        url += '/' + part.replace(/^\//, '');
      });

      return url;
    }

    function queryString(params) {
      return $window.jQuery.param(params);
    }
  }
})();
