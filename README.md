# BioSentiers Server

This repository contains the Node.js Express server application for the BioSentiers project.

* [Requirements](#requirements)
* [Development](#dev)
  * [First-time setup](#setup)
  * [Run it](#dev-run)
  * [Create an admin user](#dev-create-admin)
  * [Test the production environment](#prod-run)
  * [Upgrade to the latest version](#upgrade)
* [Configuration](#config)
  * [Server options](#config-server)
  * [Development options](#config-dev)





<a name="requirements"></a>
## Requirements

* [Node.js](https://nodejs.org) 4.x
* [npm](https://www.npmjs.com) (usually bundled with Node.js)
* [PostgreSQL](https://www.postgresql.org) 9.5+
* [PostGIS](http://postgis.net) 2.2+

Additional development requirements:

* [Gulp](http://gulpjs.com) (install with `npm install -g gulp-cli`)
* [Knex](http://knexjs.org) (install with `npm install -g knex`)





<a name="dev"></a>
## Development

How to set up your machine to contribute to the project.



<a name="setup"></a>
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

        knex migrate:latest



<a name="dev-run"></a>
### Run it

* Run the default gulp task:

        gulp



<a name="dev-create-admin"></a>
### Create an admin user

* An admin user must be created to use the application:

        ADMIN_EMAIL=jdoe@example.com ADMIN_PASSWORD=changeme node server/scripts/createAdmin.js



<a name="prod-run"></a>
### Test the production environment

* Run the production gulp task which will concatenate and minify all assets:

        gulp prod



<a name="upgrade"></a>
### Upgrade to the latest version

* Update your branch (and resolve any conflicts):

        git pull

* Install new application dependencies (if any):

        npm install

* Update `config/local.env.js` if new configuration variables are required.

* Run the application.





<a name="config"></a>
## Configuration

The application is configured through environment variables which are listed here.



<a name="config-server"></a>
### Server options

* `NODE_ENV` - The runtime environment, either `development`, `production` or `test`.
* `DATABASE_URI` - The full connection string to the database. Defaults to `postgres://localhost/biosentiers`.
* `PROTOCOL` - The protocol to run the Node.js HTTP server on. Defaults to `http`.
* `HOST` - The host to run the Node.js HTTP server on. Defaults to `localhost`.
* `PORT` - The port to run the Node.js HTTP server on. Defaults to `3000`.
* `SECRET`- The secret key used to sign authentication tokens (should be at least 100 characters long).
* `BCRYPT_COST` - Key expansion iteraction count of the [bcrypt algorithm](https://en.wikipedia.org/wiki/Bcrypt)
                  (this is actually a power of 2 of the number of iterations). Defaults to `10`.
* `LOG_LEVEL` - The minimum severity of messages to logged.
                Available levels are `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`.
                If the level is set to `WARN`, for example, only `WARN`, `ERROR` and `FATAL` messages will be logged.
                Defaults to `TRACE` in the development and test environments, `INFO` in the production environment.



<a name="config-dev"></a>
### Development options

* `LIVERELOAD` - Whether to use automatically reload the page when a change occurs while developing.
                 Defaults to `true` in the development environment, `false` in other environments.
* `LIVERELOAD_PORT` - The port to run the livereload server on.
                      Defaults to `35729` in the development environment.
* `OPEN` - Whether to automatically open the running application in the browser when running the application.
           Defaults to `true` in the development environment, `false` in other environments.
* `OPEN_BROWSER` - The name of the browser to open.
                   Defaults to your default system browser.
