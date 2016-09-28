exports.canCreate = function(req) {
  return true;
};

exports.canList = function(req) {
  return this.authenticated();
};

exports.canRetrieve = function(req) {
  return this.hasRole('admin') || this.sameRecord(req.user, req.record);
};

exports.canUpdate = exports.canRetrieve;

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
