var config = require('../../config'),
    express = require('express');

function serveIndex(req, res) {
  res.sendFile('index.html', { root: config.publicDir });
}

var router = express.Router();
router.get('/', serveIndex);
router.get('/*', serveIndex);

module.exports = router;
