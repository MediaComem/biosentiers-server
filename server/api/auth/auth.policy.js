exports.canInvite = function(req) {
  return this.authenticated() && this.hasRole('admin');
};
