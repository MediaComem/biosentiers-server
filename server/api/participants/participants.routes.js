var controller = require('./participants.api'),
    express = require('express'),
    policy = require('./participants.policy'),
    utils = require('../utils');

var router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

module.exports = router;
