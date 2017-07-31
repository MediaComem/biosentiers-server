const auth = require('../auth');
const controller = require('./installation-events.api');
const express = require('express');
const policy = require('./installation-events.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate, { authTypes: [ 'installation' ] }),
  controller.create);

router.get('/',
  auth.authorize(policy.canListByInstallation, { authTypes: [ 'user', 'installation' ]}),
  controller.listByInstallation);

module.exports = router;
