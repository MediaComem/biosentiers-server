const auth = require('../auth');
const controller = require('./excursions.api');
const express = require('express');
const participantsRoutes = require('../participants/participants.routes');
const policy = require('./excursions.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate),
  controller.create);

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

router.get('/:id',
  controller.fetchExcursion,
  auth.authorize(policy.canRetrieve, controller.resourceName),
  controller.retrieve);

router.patch('/:id',
  controller.fetchExcursion,
  auth.authorize(policy.canUpdate, controller.resourceName),
  controller.update);

router.use('/:id/participants',
  controller.fetchExcursion,
  participantsRoutes);

module.exports = router;
