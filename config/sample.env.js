module.exports = function(env) {

  /*
   * The server assumes that the databases configured in $DATABASE_URL
   * are already created and have PostGIS enabled.
   */

  const vars = {
    PROTOCOL: 'http',
    HOST: 'localhost',
    PORT: '3000',
    DATABASE_URL: 'postgres://localhost/biosentiers',
    APIDOC_OPEN: 'true',
    APIDOC_HOST: 'localhost',
    APIDOC_PORT: '3001',
    BROWSER: 'chrome',
    SECRET: 'changeme'
  };

  if (env == 'production') {
    vars.PORT = '3002';
    vars.DATABASE_URL = 'postgres://localhost/biosentiers-production';
  }

  if (env != 'test') {
    vars.SMTP_HOST = 'smtp.example.com';
    vars.SMTP_PORT = 587;
    vars.SMTP_SECURE = false;
    vars.SMTP_USERNAME = 'jdoe@example.com';
    vars.SMTP_PASSWORD = 'letmein';
    vars.SMTP_FROM_NAME = 'John\'s Local BioSentiers Server';
    vars.SMTP_FROM_ADDRESS = 'jdoe@example.com';
  }

  if (env == 'test') {
    vars.PORT = '3003';
    // This should be a separate database from the ones used for development
    // or production, as it will be cleared every time you run the tests.
    vars.DATABASE_URL = 'postgres://localhost/biosentiers-test';
  }

  return vars;
};
