const auth = require('../auth');
const controller = require('./participants.api');
const express = require('express');
const policy = require('./participants.policy');

const router = express.Router();

router.post('/',
  auth.authorize(policy.canCreate),
  controller.create);

router.get('/',
  auth.authorize(policy.canList),
  controller.list);

router.patch('/:id',
  controller.fetchParticipant,
  auth.authorize(policy.canUpdate, controller.resourceName),
  controller.update);

router.delete('/:id',
  controller.fetchParticipant,
  auth.authorize(policy.canDelete, controller.resourceName),
  controller.delete);

module.exports = router;
