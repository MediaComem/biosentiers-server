const liveServer = require('live-server');
const path = require('path');

const config = require('../config');

if (!config.apiDoc.open) {
  return;
}

liveServer.start({
  browser: config.browser,
  host: config.apiDoc.host,
  port: config.apiDoc.port,
  root: path.join(__dirname, '..', 'doc', 'api'),
  wait: 500
});
