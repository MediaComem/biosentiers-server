const auth = require('../auth');
const controller = require('./installation-events.api');
const express = require('express');
const installationsController = require('../installations/installations.api');
const policy = require('./installation-events.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate, {
    authTypes: [ 'installation' ],
    resourceId: req => req.installation.get('api_id'),
    resourceName: installationsController.resourceName
  }),
  controller.create);

router.get('/',
  auth.authorize(policy.canListByInstallation, {
    authTypes: [ 'user', 'installation' ],
    resourceId: req => req.installation.get('api_id'),
    resourceName: installationsController.resourceName
  }),
  controller.listByInstallation);

module.exports = router;
