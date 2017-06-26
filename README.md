# BioSentiers Server

This repository contains the Node.js Express server application for the BioSentiers project.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Requirements](#requirements)
- [Development](#development)
  - [First-time setup](#first-time-setup)
  - [Run it](#run-it)
  - [Create an admin user](#create-an-admin-user)
  - [Upgrade to the latest version](#upgrade-to-the-latest-version)
  - [Scripts](#scripts)
- [Production](#production)
  - [Deploy in the Vagrant testing environment](#deploy-in-the-vagrant-testing-environment)
- [Configuration](#configuration)
  - [Server options](#server-options)
  - [Mailer options](#mailer-options)
  - [Development options](#development-options)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->





## Requirements

* [Node.js](https://nodejs.org) 6.x
* [PostgreSQL](https://www.postgresql.org) 9.5+
* [PostGIS](http://postgis.net) 2.2+

Additional development requirements:

* [Nodemon](https://nodemon.io) (install with `npm install -g nodemon`)
* [Knex](http://knexjs.org) (install with `npm install -g knex`)





## Development

How to set up your machine to contribute to the project.



### First-time setup

* Clone this repository:

        git clone https://github.com/MediaComem/biosentiers-server.git

* Install the application's dependencies:

        cd /path/to/repo
        npm install

* Create your local configuration file:

        cp config/sample.env.js config/local.env.js

* Edit `config/local.env.js` and customize it as needed on your machine.
  It allows you to override the [environment variables](#config) used to configure the application.

* Migrate the database:

        npm run migrate



### Run it

* Run the dev npm script:

        npm run dev



### Create an admin user

* An admin user must be created to use the application:

        ADMIN_EMAIL=jdoe@example.com ADMIN_PASSWORD=changeme node server/scripts/create-admin.js



### Upgrade to the latest version

* Update your branch (and resolve any conflicts):

        git pull

* Install new application dependencies (if any):

        npm install

* Update `config/local.env.js` if new configuration variables are required.

* Run the application.



### Scripts

| Script           | Purpose                                                                |
| :---             | :---                                                                   |
| `npm run apidoc` | Build and serve the API documentation in your browser with live reload |
| `npm run dev`    | Validate the code, run the server and serve the API documentation      |
| `npm run doctoc` | Re-generate the table of contents in README.md                         |
| `npm run lint`   | Validate all JavaScript code with JSHint                               |
| `npm run server` | Run the server (for development) with live reload                      |
| `npm start`      | Run the server (for production)                                        |
| `npm test`       | Run automated tests                                                    |





## Production

How to deploy the backend to a remote server.

These instructions assume that:

* You have provisioned an infrastructure following the instructions in the
  [BioSentiers infrastructure][https://github.com/MediaComem/biosentiers-infra] repository
* You have installed the [deploy][https://github.com/AlphaHydrae/deploy] shell script
  and it is available in your PATH



### Deploy in the Vagrant testing environment

```bash
$> deploy vagrant setup
$> deploy vagrant ref master
```





## Configuration

The application is configured through environment variables which are listed here.



### Server options

* `NODE_ENV` - The runtime environment, either `development`, `production` or `test`. Defaults to `development`.
* `PORT` - The port to run the Node.js HTTP server on. Defaults to `3000`.
* `BASE_URL` - The URL at which the application will be accessible.
  If not set, it will be built based on `$PROTOCOL`, `$HOST` and `$PORT`:

  * `PROTOCOL` - The protocol (ignored if `$BASE_URL` is set). Defaults to `http`.
  * `HOST` - The host (ignored if `$BASE_URL` is set). Defaults to `localhost`.
* `DATABASE_URL` - The full connection string to the database.
  If not set, it will be built based on the following variable:

  * `DATABASE_USERNAME` - The PostgreSQL user to connect as. Not set by default.
  * `DATABASE_PASSWORD` - The password of the PostgreSQL user. Not set by default.
  * `DATABASE_HOST` - The host at which to reach the PostgreSQL database. Defaults to `localhost`.
  * `DATABASE_PORT` - The port to use to connect to the PostgreSQL database. Defaults to `5432`.
  * `DATABASE_NAME` - The name of the database. Defaults to `biosentiers`.
* `SECRET`- The secret key used to sign authentication tokens (should be at least 100 characters long).
* `BCRYPT_COST` - Key expansion iteraction count of the [bcrypt algorithm](https://en.wikipedia.org/wiki/Bcrypt)
                  (this is actually a power of 2 of the number of iterations). Defaults to `10`.
* `LOG_LEVEL` - The minimum severity of messages to logged.
                Available levels are `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`.
                If the level is set to `WARN`, for example, only `WARN`, `ERROR` and `FATAL` messages will be logged.
                Defaults to `TRACE` in the development and test environments, `INFO` in the production environment.

### Mailer options

E-mails are sent by the server for some workflows, e.g. when users register.

* `SMTP_ENABLED` - Whether to send e-mails. Defaults to `true`.
* `SMTP_HOST` - The host of the SMTP server.
* `SMTP_PORT` - The port of the SMTP server.
* `SMTP_SECURE` - If true, the connection will use TLS.
  In most cases set this value to `true` if you are connecting to port 465. For port 587 or 25 keep it `false`.
  Defaults to `false`.
* `SMTP_USERNAME` - The user to authenticate as.
* `SMTP_PASSWORD` - The user's password.
* `SMTP_FROM_NAME` - The name of the sender. Defaults to `BioSentiers`.
* `SMTP_FROM_ADDRESS` - The sender's address.



### Development options

* `APIDOC_OPEN` - Whether to automatically open the API documentation in your browser.
                  Defaults to `true` in the development environment, `false` in other environments.
* `APIDOC_HOST` - The host to serve the API documentation on. Defaults to `localhost`.
* `APIDOC_PORT` - The port to serve the API documentation on. Defaults to `3001`.
* `BROWSER` - The name of the browser to open to read the API documentation.
              Defaults to your default system browser.
