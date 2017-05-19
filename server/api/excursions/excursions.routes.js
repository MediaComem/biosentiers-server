const controller = require('./excursions.api');
const express = require('express');
const participantsRoutes = require('../participants/participants.routes');
const policy = require('./excursions.policy');
const utils = require('../utils');

const router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

router.get('/',
  utils.authorize(policy.canList),
  controller.list);

router.get('/:id',
  controller.fetchExcursion,
  utils.authorize(policy.canRetrieve, controller.name),
  controller.retrieve);

router.patch('/:id',
  controller.fetchExcursion,
  utils.authorize(policy.canUpdate, controller.name),
  controller.update);

router.use('/:id/participants',
  controller.fetchExcursion,
  participantsRoutes);

module.exports = router;
