module.exports = {
  // http://pm2.keymetrics.io/docs/usage/application-declaration/
  apps: [
    {
      name: 'BioSentiers Backend',
      script: 'bin/www',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
