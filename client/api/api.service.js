(function() {
  'use strict';

  angular
    .module('bio.api')
    .factory('BioApi', BioApiService);

  function BioApiService(BioAuth, $http) {
    return function(options) {

      options = _.defaults({}, options, {
        headers: {}
      });

      if (!options.url.match(/^https?:\/\//) && !options.url.match(/^\/\//) && !options.url.match(/^\/api\//)) {
        options.url = join('/api', options.url);
      }

      if (BioAuth.apiToken && !options.headers.Authorization) {
        options.headers.Authorization = 'Bearer ' + BioAuth.apiToken;
      }

      return $http(options);
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
})();
