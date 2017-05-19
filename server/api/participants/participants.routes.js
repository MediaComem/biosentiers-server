var controller = require('./participants.api'),
    express = require('express'),
    policy = require('./participants.policy'),
    utils = require('../utils');

var router = express.Router();

router.post('/',
  utils.authorize(policy.canCreate),
  controller.create);

router.get('/',
  utils.authorize(policy.canList),
  controller.list);

router.patch('/:id',
  controller.fetchParticipant,
  utils.authorize(policy.canUpdate, controller.name),
  controller.update);

router.delete('/:id',
  controller.fetchParticipant,
  utils.authorize(policy.canDelete, controller.name),
  controller.delete);

module.exports = router;
