module.exports = function(env) {

  var vars = {
    PROTOCOL: 'http',
    HOST: 'localhost',
    PORT: '3000',
    DATABASE_URI: 'postgres://localhost/biosentiers',
    OPEN: 'true',
    OPEN_BROWSER: 'chrome'
  };

  if (env == 'production') {
    vars.PORT = '3001';
    vars.DATABASE_URI = 'postgres://localhost/biosentiers-production';
  }

  if (env == 'test') {
    vars.PORT = '3002';
    vars.DATABASE_URI = 'postgres://localhost/biosentiers-test';
  }

  return vars;
};
