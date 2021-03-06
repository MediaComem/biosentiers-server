const auth = require('../auth');
const controller = require('./pois.api');
const express = require('express');
const policy = require('./pois.policy');

const router = express.Router();

router.head('/',
  auth.authorize(policy.canList),
  controller.head);

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

module.exports = router;
