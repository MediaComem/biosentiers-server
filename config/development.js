module.exports = function(base) {

  var liveReloadPort = base.parseInt(process.env.LIVERELOAD_PORT) || 35729;

  return {
    liveReloadUrl: process.env.LIVERELOAD_URL || 'http://localhost:' + liveReloadPort + '/livereload.js'
  };
};
