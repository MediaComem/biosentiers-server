const auth = require('../auth');
const controller = require('./stats.api');
const express = require('express');
const policy = require('./stats.policy');

const router = express.Router();

router.get('/',
  auth.authorize(policy.canRetrieve),
  controller.retrieve);

module.exports = router;
