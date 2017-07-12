const auth = require('../auth');
const controller = require('./zones.api');
const express = require('express');
const policy = require('./zones.policy');

const router = express.Router();

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

router.get('/:id',
  controller.fetchZone,
  auth.authorize(policy.canRetrieve, controller.resourceName),
  controller.retrieve);

module.exports = router;
