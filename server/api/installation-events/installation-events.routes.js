const auth = require('../auth');
const controller = require('./installation-events.api');
const express = require('express');
const policy = require('./installation-events.policy');

const router = express.Router();

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

router.get('/:id',
  controller.fetchInstallationEvent,
  auth.authorize(policy.canRetrieve, controller.resourceName, { authTypes: [ 'user', 'installation' ] }),
  controller.retrieve);

module.exports = router;
