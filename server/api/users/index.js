var controller = require('./users.api'),
    express = require('express');

var router = express.Router();

router.get('/', controller.index);

module.exports = router;
