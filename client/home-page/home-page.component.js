(function() {
  'use strict';

  /**
   * The landing page of the application.
   */
  angular
    .module('bio.home-page')
    .controller('BioHomePageCtrl', BioHomePageCtrl)
    .component('bioHomePage', {
      controller: 'BioHomePageCtrl',
      controllerAs: 'homePageCtrl',
      templateUrl: '/assets/home-page/home-page.html'
    });

  function BioHomePageCtrl() {

    var homePageCtrl = this;

    this.icon = 'star';
  }
})();
