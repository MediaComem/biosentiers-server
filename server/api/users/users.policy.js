var _ = require('lodash'),
    User = require('../../models/user');

exports.canCreate = function(req) {
  this.authenticated({ authTypes: [ 'user', 'invitation' ] });

  if (req.jwtToken.authType == 'invitation') {
    this.forbidChange('active', true, 'set the status of an invited user');
    this.forbidChange('email', req.jwtToken.email, 'set the e-mail of an invited user');
    this.forbidChange('role', req.jwtToken.role, 'set the role of an invited user');
    return true;
  } else {
    return req.user && req.user.hasRole('admin');
  }
};

exports.canList = function(req) {
  return req.query.email || (this.authenticated() && this.hasRole('admin'));
};

exports.canRetrieve = function(req) {
  return this.authenticated() && (this.hasRole('admin') || this.sameRecord(req.user, req.record));
};

exports.canUpdate = function(req) {
  if (this.hasRole('admin')) {
    return true;
  } else if (this.authenticated() && this.sameRecord(req.user, req.record)) {
    this.forbidChange('active', req.user.get('active'), 'change the status of a user');
    this.forbidChange('email', req.user.get('email'), 'change the e-mail of a user');
    this.forbidChange('role', req.user.get('role'), 'change the role of a user');
    return true;
  }
};

exports.scope = function(req) {

  var scope = new User();

  if (req.query.email && (!req.user || !req.user.hasRole('admin'))) {
    scope = scope.where('email', req.query.email);
  }

  return scope;
};

exports.serialize = function(user, req) {

  var serialized = {
    email: user.get('email')
  };

  if (req.user && req.user.hasRole('admin')) {
    _.extend(serialized, {
      id: user.get('api_id'),
      active: user.get('active'),
      role: user.get('role'),
      createdAt: user.get('created_at'),
      updatedAt: user.get('updated_at')
    });
  }

  return serialized;
};
