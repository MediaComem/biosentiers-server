const _ = require('lodash');
const InstallationEvent = require('../../models/installation-event');
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

exports.parse = function(data, installationEvent = new InstallationEvent()) {
  installationEvent.parseFrom(data, 'type', 'version', 'occurredAt');
  installationEvent.updateProperties(data.properties);
  return installationEvent;
};

exports.serialize = function(req, installationEvent, options) {
  return {
    id: installationEvent.get('api_id'),
    href: installationEvent.get('href'),
    installationHref: installationEvent.related('installation').get('href'),
    type: installationEvent.get('type'),
    version: installationEvent.get('version'),
    properties: installationEvent.get('properties'),
    createdAt: installationEvent.get('created_at'),
    occurredAt: installationEvent.get('occurred_at')
  };
};
