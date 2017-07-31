// Authentication types
exports.types = [
  // User JWT tokens are used by logged users
  'user',
  // Installation JWT tokens are used by mobile apps to send logs
  'installation',
  // Invitation JWT tokens are sent by e-mail to invited users
  'invitation',
  // Password reset JWT tokens are sent by e-mail to users
  'passwordReset'
];
