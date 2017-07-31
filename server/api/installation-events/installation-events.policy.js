const _ = require('lodash');
const InstallationEvent = require('../../models/installation-event');
const parsing = require('../parsing');
const policy = require('../policy');

exports.canCreate = function(req) {
  return policy.authenticated(req, { authTypes: 'installation' }) && policy.sameRecord(req.currentInstallation, req.installation);
};

exports.canList = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.canListByInstallation = function(req) {
  return policy.authenticated(req, { authTypes: [ 'user', 'installation' ] }) && (policy.hasRole(req, 'admin') || policy.sameRecord(req.currentInstallation, req.installation));
};

exports.canRetrieve = function(req) {
  return policy.authenticated(req, { authTypes: [ 'user', 'installation' ] }) && (policy.hasRole(req, 'admin') || policy.sameRecord(req.currentInstallation, req.installationEvent.related('installation')));
};

exports.scope = function(req) {
  return new InstallationEvent();
};

exports.parse = function(req, installationEvent = new InstallationEvent()) {
  parsing.parseJsonIntoRecord(req.body, installationEvent, 'type', 'occurredAt');
  installationEvent.updateProperties(req.body.properties);
  return installationEvent;
};

exports.serialize = function(req, installationEvent, options) {
  return {
    id: installationEvent.get('api_id'),
    href: installationEvent.get('href'),
    installationHref: installationEvent.related('installation').get('href'),
    properties: installationEvent.get('properties'),
    createdAt: installationEvent.get('created_at'),
    occurredAt: installationEvent.get('occurred_at')
  };
};
