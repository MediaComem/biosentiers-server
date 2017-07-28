const _ = require('lodash');
const Installation = require('../../models/installation');
const policy = require('../policy');
const utils = require('../utils');

exports.canCreate = function(req) {
  return true;
};

exports.canList = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.canRetrieve = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.canUpdate = function(req) {
  return policy.authenticated(req) && policy.hasRole(req, 'admin');
};

exports.scope = function(req) {
  return new Installation();
};

exports.parse = function(req, installation = new Installation()) {
  if (req.body.id && !installation.has('api_id')) {
    installation.set('api_id', req.body.id.toLowerCase());
  }

  installation.updateProperties(req.body.properties);

  return installation;
};

exports.serialize = function(req, installation, options) {

  const serialized = {
    id: installation.get('api_id'),
    href: installation.get('href'),
    properties: installation.get('properties'),
    createdAt: installation.get('created_at'),
    updatedAt: installation.get('updated_at')
  };

  if (_.get(options, 'sharedSecret')) {
    serialized.sharedSecret = new Buffer(installation.get('shared_secret'), 'hex').toString('base64');
  }

  return serialized;
};
