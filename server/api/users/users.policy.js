exports.canCreate = function(req) {
  return true;
};

exports.canList = function(req) {
  return this.authenticated();
};

exports.canRetrieve = function(req) {
  return this.authenticated() && (this.hasRole('admin') || this.sameRecord(req.user, req.record));
};

exports.canUpdate = function(req) {
  if (this.validOtp('registration', { active: false }) && !req.user.isRegistered()) {
    this.forbidChange('email', req.user.get('email'), 'change the e-mail');
    return this.sameRecord(req.user, req.record);
  } else if (this.hasRole('admin')) {
    return true;
  } else if (this.authenticated() && this.sameRecord(req.user, req.record)) {
    return this.forbidChange('active', req.user.get('active'), 'change the status of a user')
      && this.forbidChange('email', req.user.get('email'), 'change the e-mail of a user')
      && this.forbidChange('role', req.user.get('role'), 'change the role of a user');
  }
};

exports.serialize = function(user, req) {
  return {
    id: user.get('api_id'),
    email: user.get('email'),
    active: user.get('active'),
    role: user.get('role'),
    createdAt: user.get('created_at'),
    updatedAt: user.get('updated_at')
  };
};
