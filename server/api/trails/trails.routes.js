var controller = require('./trails.api'),
    express = require('express'),
    policy = require('./trails.policy'),
    utils = require('../utils');

var router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

router.get('/',
  utils.authorize(policy.canList),
  controller.list);

module.exports = router;
