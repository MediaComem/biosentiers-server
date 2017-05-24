const auth = require('../auth');
const controller = require('./trails.api');
const express = require('express');
const policy = require('./trails.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate),
  controller.create);

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

module.exports = router;
