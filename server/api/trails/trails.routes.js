const controller = require('./trails.api');
const express = require('express');
const policy = require('./trails.policy');
const utils = require('../utils');

const router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

router.get('/',
  utils.authorize(policy.canList),
  controller.list);

module.exports = router;
