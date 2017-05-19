const controller = require('./participants.api');
const express = require('express');
const policy = require('./participants.policy');
const utils = require('../utils');

const router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

router.get('/',
  utils.authorize(policy.canList),
  controller.list);

router.patch('/:id',
  controller.fetchParticipant,
  utils.authorize(policy.canUpdate, controller.resourceName),
  controller.update);

router.delete('/:id',
  controller.fetchParticipant,
  utils.authorize(policy.canDelete, controller.resourceName),
  controller.delete);

module.exports = router;
