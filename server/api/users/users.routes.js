const auth = require('../auth');
const controller = require('./users.api');
const express = require('express');
const policy = require('./users.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate, { authTypes: [ 'user', 'invitation' ] }),
  controller.create);

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

router.get('/:id',
  controller.fetchUser,
  auth.authorize(policy.canRetrieve, controller.resourceName),
  controller.retrieve);

router.patch('/:id',
  controller.fetchUser,
  auth.authorize(policy.canUpdate, controller.resourceName, { authTypes: [ 'user', 'passwordReset' ] }),
  controller.update);

module.exports = router;
