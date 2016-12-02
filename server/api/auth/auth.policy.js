exports.canInvite = function(req) {
  return this.authenticated() && this.hasRole('admin');
};

exports.canBeInvited = function(req) {
  return this.authenticated({ authTypes: [ 'invitation' ] });
};
