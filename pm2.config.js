module.exports = {
  // http://pm2.keymetrics.io/docs/usage/application-declaration/
  apps: [
    {
      name: 'biosentiers-backend',
      script: 'bin/www',
      cwd: '/var/www/biosentiers/backend/current',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
