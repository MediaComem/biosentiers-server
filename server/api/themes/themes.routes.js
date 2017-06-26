const auth = require('../auth');
const controller = require('./themes.api');
const express = require('express');
const policy = require('./themes.policy');

const router = express.Router();

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

module.exports = router;
