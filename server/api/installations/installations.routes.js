const auth = require('../auth');
const controller = require('./installations.api');
const express = require('express');
const installationEventRoutes = require('../installation-events/installation-events.installation-routes.js');
const policy = require('./installations.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate),
  controller.create);

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

router.get('/:id',
  controller.fetchInstallation,
  auth.authorize(policy.canRetrieve, controller.resourceName),
  controller.retrieve);

router.patch('/:id',
  controller.fetchInstallation,
  auth.authorize(policy.canUpdate, controller.resourceName),
  controller.update);

router.use('/:id/events',
  controller.fetchInstallation,
  installationEventRoutes);

module.exports = router;
