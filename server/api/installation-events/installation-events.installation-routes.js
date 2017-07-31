const auth = require('../auth');
const controller = require('./installation-events.api');
const express = require('express');
const policy = require('./installation-events.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate),
  controller.create);

router.get('/',
  auth.authorize(policy.canListByInstallation),
  controller.listByInstallation);

module.exports = router;
