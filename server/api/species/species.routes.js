const auth = require('../auth');
const controller = require('./species.api');
const express = require('express');
const policy = require('./species.policy');

const router = express.Router();

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

module.exports = router;
