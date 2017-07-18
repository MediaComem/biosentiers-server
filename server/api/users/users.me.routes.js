const auth = require('../auth');
const controller = require('./users.api');
const express = require('express');
const policy = require('./users.policy');

const router = express.Router();

router.get('/',
  auth.authenticate(),
  controller.fetchMe,
  auth.authorize(policy.canRetrieve, { authenticate: false }),
  controller.retrieve);

router.patch('/',
  auth.authenticate({ authTypes: [ 'user', 'passwordReset' ] }),
  controller.fetchMe,
  auth.authorize(policy.canUpdate, controller.resourceName, { authTypes: [ 'user', 'passwordReset' ] }),
  controller.update);

module.exports = router;
