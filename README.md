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
- [Configuration](#configuration)
  - [Server options](#server-options)
  - [Development options](#development-options)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->





## Requirements

* [Node.js](https://nodejs.org) 6.x
* [npm](https://www.npmjs.com) (usually bundled with Node.js)
* [PostgreSQL](https://www.postgresql.org) 9.5+
* [PostGIS](http://postgis.net) 2.2+

Additional development requirements:

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

        ADMIN_EMAIL=jdoe@example.com ADMIN_PASSWORD=changeme node server/scripts/createAdmin.js



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





## Configuration

The application is configured through environment variables which are listed here.



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



### Development options

* `APIDOC_OPEN` - Whether to automatically open the API documentation in your browser.
                  Defaults to `true` in the development environment, `false` in other environments.
* `APIDOC_HOST` - The host to serve the API documentation on. Defaults to `localhost`.
* `APIDOC_PORT` - The port to serve the API documentation on. Defaults to `3001`.
* `BROWSER` - The name of the browser to open to read the API documentation.
              Defaults to your default system browser.
