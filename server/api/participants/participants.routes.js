var controller = require('./participants.api'),
    express = require('express'),
    policy = require('./participants.policy'),
    utils = require('../utils');

var router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

router.get('/',
  utils.authorize(policy.canList),
  controller.list);

router.patch('/:id',
  controller.fetchRecord,
  utils.authorize(policy.canUpdate, controller.name),
  controller.update);

module.exports = router;
