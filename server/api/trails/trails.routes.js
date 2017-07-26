const auth = require('../auth');
const controller = require('./trails.api');
const express = require('express');
const poisRoutes = require('../pois/pois.routes');
const policy = require('./trails.policy');
const zonesRoutes = require('../zones/zones.trail-routes');

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

router.get('/:id/data-package',
  controller.fetchTrail,
  auth.authorize(policy.canRetrieveDataPackage, controller.resourceName),
  controller.retrieveDataPackage);

router.use('/:id/pois',
  controller.fetchTrail,
  poisRoutes);

router.use('/:id/zones',
  controller.fetchTrail,
  zonesRoutes);

module.exports = router;
