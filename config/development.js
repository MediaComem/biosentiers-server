var _ = require('lodash');

module.exports = function(base) {

  var config = {};

  var liveReloadPort = base.parseInt(process.env.LIVERELOAD_PORT) || 35729;
  config.liveReloadUrl = base.protocol + '://' + base.host + ':' + liveReloadPort + '/livereload.js';

  return config;
};
