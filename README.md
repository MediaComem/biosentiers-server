# BioSentiers Server

This repository contains the Node.js Express server application for the BioSentiers project.





## Development

How to set up your machine to contribute to the project.



### Requirements

* [Node.js](https://nodejs.org) 4.x
* [npm](https://www.npmjs.com) (bundled with Node.js)
* [Gulp](http://gulpjs.com) (install with `npm install -g gulp-cli` once you have Node.js & npm)
* [PostgreSQL](https://www.postgresql.org) 9.5+
* [PostGIS](http://postgis.net) 2.2+



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



### Develop

* Run the default gulp task:

      gulp



### Test the production environment

* Run the production gulp task which will concatenate and minify all assets:

      gulp prod



### Upgrade to the latest version

* Update your branch (and resolve any conflicts):

      git pull

* Install new application dependencies (if any):

      npm install

* Update `config/local.env.js` if new configuration variables are required.

* Run the application.





## Configuration

The application is configured through environment variables which are listed here.



### Server options

* `NODE_ENV` - The runtime environment, either `development`, `production` or `test`.
* `DATABASE_URI` - The full connection string to the database. Defaults to `postgres://localhost/biosentiers`.
* `PROTOCOL` - The protocol to run the Node.js HTTP server on. Defaults to `http`.
* `HOST` - The host to run the Node.js HTTP server on. Defaults to `localhost`.
* `PORT` - The port to run the Node.js HTTP server on. Defaults to `3000`.
* `LOG_LEVEL` - The minimum severity of messages to logged.
                Available levels are `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`.
                If the level is set to `WARN`, for example, only `WARN`, `ERROR` and `FATAL` messages will be logged.
                Defaults to `TRACE` in the development and test environments, `INFO` in the production environment.



### Development options

* `LIVERELOAD` - Whether to use automatically reload the page when a change occurs while developing.
                 Defaults to `true` in the development environment, `false` in other environments.
* `LIVERELOAD_PORT` - The port to run the livereload server on.
                      Defaults to `35729` in the development environment.
* `OPEN` - Whether to automatically open the running application in the browser when running the application.
           Defaults to `true` in the development environment, `false` in other environments.
* `OPEN_BROWSER` - The name of the browser to open.
                   Defaults to your default system browser.
