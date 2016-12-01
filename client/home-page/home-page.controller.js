(function() {
  'use strict';

  angular
    .module('bio.home-page')
    .controller('BioHomePageCtrl', BioHomePageCtrl);

  function BioHomePageCtrl() {

    var homePageCtrl = this;

    this.icon = 'star';
  }
})();
