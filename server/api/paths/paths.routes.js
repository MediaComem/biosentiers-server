const auth = require('../auth');
const controller = require('./paths.api');
const express = require('express');
const policy = require('./paths.policy');

const router = express.Router();

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

module.exports = router;
