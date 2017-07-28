const auth = require('../auth');
const controller = require('./installation-events.api');
const express = require('express');
const policy = require('./installation-events.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate),
  controller.create);

module.exports = router;
