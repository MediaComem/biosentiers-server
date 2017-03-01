var controller = require('./excursions.api'),
    express = require('express'),
    participantsRoutes = require('../participants/participants.routes'),
    policy = require('./excursions.policy'),
    utils = require('../utils');

var router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

router.get('/',
  utils.authorize(policy.canList),
  controller.list);

router.use('/:id',
  controller.fetchRecord,
  participantsRoutes);

module.exports = router;
