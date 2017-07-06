const auth = require('../auth');
const controller = require('./trails.api');
const express = require('express');
const pathsRoutes = require('../paths/paths.routes');
const poisRoutes = require('../pois/pois.routes');
const policy = require('./trails.policy');
const zonesRoutes = require('../zones/zones.routes');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate),
  controller.create);

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

router.get('/:id',
  controller.fetchTrail,
  auth.authorize(policy.canRetrieve, controller.resourceName),
  controller.retrieve);

router.use('/:id/paths',
  controller.fetchTrail,
  pathsRoutes);

router.use('/:id/pois',
  controller.fetchTrail,
  poisRoutes);

router.use('/:id/zones',
  controller.fetchTrail,
  zonesRoutes);

module.exports = router;
