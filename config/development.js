var _ = require('lodash');

module.exports = function(base) {

  var config = {
    open: _.get(base, 'open', true)
  };

  var liveReloadPort = base.parseInt(process.env.LIVERELOAD_PORT) || 35729;
  config.liveReloadUrl = config.protocol + '://' + config.host + ':' + liveReloadPort + '/livereload.js';

  return config;
};
