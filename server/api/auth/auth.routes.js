const auth = require('../auth');
const controller = require('./auth.api');
const express = require('express');
const policy = require('./auth.policy');

const router = express.Router();

router.post('/',
  controller.authenticate);

router.post('/invitations',
  auth.authorize(policy.canInvite),
  controller.createInvitation);

router.get('/invitations',
  auth.authorize(policy.canRetrieveInvitation, { authTypes: [ 'invitation' ] }),
  controller.retrieveInvitation);

router.post('/passwordResets',
  auth.authorize(policy.canResetPassword),
  controller.requestPasswordReset);

router.get('/passwordResets',
  auth.authorize(policy.canRetrievePasswordReset, { authTypes: [ 'passwordReset' ] }),
  controller.retrievePasswordResetRequest);

module.exports = router;
