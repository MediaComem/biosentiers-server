var express = require('express');

var router = express.Router();

router.use('/users', require('./users'));

// Catch API 404 and return a simple status instead of an error page.
router.all('/*', function(req, res) {
  res.sendStatus(404);
});

module.exports = router;
