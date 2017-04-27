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

router.get('/:id',
  controller.fetchRecord,
  utils.authorize(policy.canRetrieve, controller.name),
  controller.retrieve);

router.patch('/:id',
  controller.fetchRecord,
  utils.authorize(policy.canUpdate, controller.name),
  controller.update);

router.use('/:id/participants',
  controller.fetchRecord,
  participantsRoutes);

module.exports = router;
