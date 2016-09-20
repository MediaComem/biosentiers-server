var _ = require('lodash'),
    apidoc = require('gulp-apidocjs'),
    autoPrefixer = require('gulp-autoprefixer'),
    chain = require('gulp-chain'),
    clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    cssmin = require('gulp-cssmin'),
    env = require('gulp-env'),
    filter = require('gulp-filter'),
    fs = require('fs'),
    getFolderSize = require('get-folder-size'),
    gulp = require('gulp'),
    handlebars = require('gulp-compile-handlebars'),
    htmlmin = require('gulp-htmlmin'),
    inject = require('gulp-inject'),
    jshint = require('gulp-jshint'),
    less = require('gulp-less'),
    livereload = require('gulp-livereload'),
    merge = require('merge-stream'),
    ngAnnotate = require('gulp-ng-annotate'),
    nodemon = require('gulp-nodemon'),
    open = require('gulp-open'),
    path = require('path'),
    prettyBytes = require('pretty-bytes'),
    pug = require('gulp-pug'),
    rev = require('gulp-rev'),
    revDeleteOriginal = require('gulp-rev-delete-original'),
    revReplace = require('gulp-rev-replace'),
    runSequence = require('run-sequence'),
    streamQueue = require('streamqueue'),
    stylus = require('gulp-stylus'),
    through = require('through2'),
    uglify = require('gulp-uglify'),
    useref = require('gulp-useref'),
    util = require('gulp-util');

// Custom utilities.
var logUtils = require('./lib/gulp-log-utils'),
    srcUtils = require('./lib/gulp-src-utils');

// Often-used functions in this file.
var gulpifySrc = srcUtils.gulpify,
    logProcessedFiles = logUtils.processedFiles,
    PluginError = util.PluginError,
    watchSrc = srcUtils.watch;

// Configuration
// -------------

var dirs = {
  devBuild: 'build/development',
  devAssets: 'build/development/assets',
  prodBuild: 'build/production',
  prodAssets: 'build/production/assets'
};

var src = {
  // Favicon.
  favicon: { files: 'client/favicon.ico' },
  // Fonts.
  fonts: { files: 'node_modules/bootstrap/dist/fonts/**/*', base: 'node_modules/bootstrap/dist' },
  // Pug templates to compile to HTML.
  index: { files: 'index.pug', cwd: 'client' },
  templates: { files: [ '*/**/*.pug' ], cwd: 'client' },
  // Less files to compile to CSS.
  less: { files: '**/*.less', cwd: 'client' },
  // Stylus files to compile to CSS.
  styl: { files: '**/*.styl', cwd: 'client' },
  // Client JavaScript.
  js: { files: 'client/**/*.js', compare: compareAngularFiles },
  // JavaScript to check with JSHint.
  lintJs: { files: [ 'bin/www', 'config/**/*.js', 'gulpfile.js', 'lib/**/*.js', 'client/**/*.js' ] },
  // Development build files.
  devCss: { files: [ 'assets/**/*.css' ], cwd: dirs.devBuild, compare: compareStylesheets },
  // Production build files.
  prod: { files: '**/*', cwd: dirs.prodBuild },
  prodCss: { files: '**/*.css', cwd: dirs.prodBuild },
  prodJs: { files: '**/*.js', cwd: dirs.prodBuild },
  prodHtml: { files: '**/*.html', cwd: dirs.prodBuild },
  prodIndex: { files: 'index.html', cwd: dirs.prodBuild }
};

var injections = {
  // Files to inject into index.html in development mode.
  development: {
    js: src.js,
    css: src.devCss
  },
  // Files to inject into index.html in production mode.
  production: {
    js: src.prodJs,
    css: src.prodCss
  }
};

var filters = {
  // Select files that should be rev'd (see `prod:rev` task).
  rev: filter([ '**/*', '!index.html', '!favicon.ico' ], { restore: true })
};

// Cleanup Tasks
// -------------

gulp.task('clean:dev', function() {
  return gulp
    .src(dirs.devBuild, { read: false })
    .pipe(clean());
});

gulp.task('clean:prod', function() {
  return gulp
    .src(dirs.prodBuild, { read: false })
    .pipe(clean());
});

gulp.task('clean', [ 'clean:dev', 'clean:prod' ]);

// Generic Tasks
// -------------

/**
 * Generates the API documentation of routes in `server/api` and saves it to `doc/api`.
 */
gulp.task('doc:api', function(callback) {
  apidoc.exec({
    src: 'server/api',
    dest: 'doc/api',
    debug: !!process.env.APIDOC_DEBUG
  }, callback);
});

/**
 * Opens the API documentation in the browser.
 */
gulp.task('doc:api:open', [ 'local:env' ], function() {
  return openBrowser('./doc/api/index.html');
});

/**
 * Generates and opens the project's documentation.
 */
gulp.task('doc', sequence('doc:api', 'doc:api:open'));

/**
 * Opens the URL of the running server in the browser.
 */
gulp.task('open', function() {
  return openBrowser(getConfig().url);
});

/**
 * Loads the environment variables defined in `config/local.env.js`
 * and in `config/ENV.env.js` (where ENV is the current environment).
 */
gulp.task('local:env', function() {

  var localEnv;
  try {
    localEnv = require('./config/local.env');
  } catch (err) {
    localEnv = {};
  }

  var currentEnv;
  try {
    currentEnv = require('./config/' + (process.env.NODE_ENV || 'development') + '.env');
  } catch (err) {
    currentEnv = {};
  }

  env.set(_.extend({}, localEnv, currentEnv));
});

// Development Tasks
// -----------------

/**
 * Copies `client/favicon.ico` to `build/development`.
 */
gulp.task('dev:favicon', function() {
  return gulpifySrc(src.favicon)
    .pipe(logProcessedFiles(dirs.devBuild))
    .pipe(toDevBuild());
});

/**
 * Copies required fonts to `build/development/assets/fonts`.
 */
gulp.task('dev:fonts', function() {
  return gulpifySrc(src.fonts)
    .pipe(logProcessedFiles(dirs.devAssets))
    .pipe(toDevBuild('assets'));
});

/**
 * Compiles the Less stylesheets in `client` to `build/development/assets`.
 */
gulp.task('dev:less', function() {
  return gulpifySrc(src.less)
    .pipe(compileLess())
    .pipe(logProcessedFiles(dirs.devAssets, 'less'))
    .pipe(toDevBuild('assets'));
});

/**
 * Runs the project's JavaScript files through JSHint.
 */
gulp.task('dev:lint', function() {
  return gulpifySrc(src.lintJs)
    .pipe(lint());
});

/**
 * Compiles the Pug templates in `client` to `build/development/assets`.
 */
gulp.task('dev:pug:templates', function() {
  return gulpifySrc(src.templates)
    .pipe(compilePug())
    .pipe(logProcessedFiles(dirs.devAssets, 'pug'))
    .pipe(toDevBuild('assets'));
});

/**
 * Compiles `client/index.pug` to `build/development` and injects the required link and script tags.
 * Stylesheets and scripts are sorted with custom functions to ensure they are in the correct order.
 */
gulp.task('dev:pug:index', function() {
  return gulpifySrc(src.index)
    .pipe(compilePug())
    .pipe(autoInject(dirs.devBuild))
    .pipe(logProcessedFiles(dirs.devBuild, 'pug'))
    .pipe(toDevBuild());
});

/**
 * Runs the server with Nodemon and restarts it when changes to server files are detected.
 */
gulp.task('dev:nodemon', function() {
  livereload.listen();

  return nodemon({
    script: 'bin/www',
    ext: 'js',
    watch: [ 'bin/www', 'config/**/*.js', 'server/**/*.js' ],
    ignore: [ '.git', 'client', 'node_modules' ],
    stdout: false
  }).on('readable', function() {
    this.stdout.on('data', function(chunk) {
      if (/^Express server listening on port/.test(chunk)) {
        livereload.changed(__dirname);
      }
    });

    this.stdout.pipe(process.stdout);
    this.stderr.pipe(process.stderr);
  });
});

/**
 * Compiles the Stylus files in `client` to `build/development/assets`.
 */
gulp.task('dev:stylus', function() {
  return gulpifySrc(src.styl)
    .pipe(compileStylus())
    .pipe(logProcessedFiles(dirs.devAssets, 'styl'))
    .pipe(toDevBuild('assets'));
});

/**
 * Watches the Less files in `client` and automatically compiles them to `build/development/assets` when changes are detected.
 */
gulp.task('dev:watch:less', function() {
  return srcUtils.watch(src.less, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(compileLess())
      .pipe(logProcessedFiles(dirs.devAssets, 'less'))
      .pipe(toDevBuild('assets'));
  });
});

/**
 * Watches the project's JavaScript files and automatically runs them through JSHint when changes are detected.
 */
gulp.task('dev:watch:lint', function() {
  return srcUtils.watch(src.lintJs, function(file) {
    return gulpifySrc(file.path)
      .pipe(lint())
      .on('error', _.noop);
  });
});

/**
 * Watches the Pug templates in `client` and automatically compiles them to `build/development/assets` when changes are detected.
 */
gulp.task('dev:watch:pug:templates', function() {
  return srcUtils.watch(src.templates, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(compilePug())
      .pipe(logProcessedFiles(dirs.devAssets, 'pug'))
      .pipe(toDevBuild('assets'));
  });
});

/**
 * Watches `client/index.pug` and automatically compiles it and injects the required link and script tags when changes are detected.
 */
gulp.task('dev:watch:pug:index', function() {
  return srcUtils.watch(src.index, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(compilePug())
      .pipe(autoInject(dirs.devBuild))
      .pipe(logProcessedFiles(dirs.devBuild, 'pug'))
      .pipe(toDevBuild());
  });
});

/**
 * Watches the Stylus files in `client` and automatically compiles them to `build/development/assets` when changes are detected.
 */
gulp.task('dev:watch:stylus', function() {
  return srcUtils.watch(src.styl, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(compileStylus())
      .pipe(logProcessedFiles(dirs.devAssets, 'styl'))
      .pipe(toDevBuild('assets'));
  });
});

/**
 * Builds all development files once:
 *
 * * Load the local environment file if it exists.
 * * Clean up the development build directory.
 * * Copy and compile all required files (favicon, fonts, Less stylesheets, Stylus stylesheets, Pug templates).
 */
gulp.task('dev:build', sequence('local:env', 'clean:dev', 'dev:lint', [ 'dev:favicon', 'dev:fonts', 'dev:less', 'dev:pug:templates', 'dev:stylus' ], 'dev:pug:index'));

/**
 * Runs all watch tasks (Less stylesheets, Stylus stylesheets, Pug templates and linting).
 */
gulp.task('dev:watch', [ 'dev:watch:less', 'dev:watch:lint', 'dev:watch:pug:templates', 'dev:watch:pug:index', 'dev:watch:stylus' ]);

/**
 * Builds and runs the development environment:
 *
 * * Execute `dev:build`.
 * * Run the development server.
 * * Run all watch tasks.
 * * Open the browser.
 */
gulp.task('dev:run', sequence('dev:build', [ 'dev:nodemon', 'dev:watch', 'open' ]));

/**
 * Alias of `dev:run`.
 */
gulp.task('dev', sequence('dev:run'));

// Production Tasks
// ----------------

/**
 * Sets the Node.js environment to production.
 */
gulp.task('prod:env', function() {
  env.set({
    NODE_ENV: 'production'
  });
});

/**
 * Compiles the Less and Stylus stylesheets in `client`, concatenates them and saves them to `build/production/assets/app.css`.
 */
gulp.task('prod:css', [ 'prod:env' ], function() {

  var lessSrc = gulpifySrc(src.less)
    .pipe(logUtils.concatenatingFiles('CSS'))
    .pipe(compileLess());

  var stylusSrc = gulpifySrc(src.styl)
    .pipe(logUtils.concatenatingFiles('CSS'))
    .pipe(compileStylus());

  return gulpifySrc(merge(lessSrc, stylusSrc))
    .pipe(srcUtils.stableSort(compareStylesheets))
    .pipe(concat('app.css'))
    .pipe(logUtils.concatenatedFiles('CSS'))
    .pipe(toProdBuild('assets'));
});

/**
 * Copies `client/favicon.ico` to `build/production`.
 */
gulp.task('prod:favicon', [ 'prod:env' ], function() {
  return gulpifySrc(src.favicon)
    .pipe(logProcessedFiles(dirs.prodBuild, null, true))
    .pipe(toProdBuild());
});

/**
 * Copies font dependencies defined in `client/dependencies.yml` to `build/production/assets/fonts`.
 */
gulp.task('prod:fonts', [ 'prod:env' ], function() {
  return gulpifySrc(src.fonts)
    .pipe(logProcessedFiles(dirs.prodAssets, null, true))
    .pipe(toProdBuild('assets'));
});

/**
 * Prepare production JavaScript files:
 *
 * * Copy all JavaScript sources.
 * * Compile all Pug templates and wrap them into JavaScript files.
 * * Run all Angular files through ng-annotate.
 * * Save all files to `build/production/assets`.
 */
gulp.task('prod:js', [ 'prod:env' ], function() {

  // JavaScript sources.
  var codeSrc = gulpifySrc(src.js)
    .pipe(logUtils.concatenatingFiles('JS'));

  // Wrapped templates.
  var templatesSrc = gulpifySrc(src.templates)
    .pipe(logUtils.concatenatingFiles('JS'))
    .pipe(compilePug())
    .pipe(minifyHtml())
    .pipe(wrapTemplate());

  return gulpifySrc(streamQueue({ objectMode: true }, codeSrc, templatesSrc))
    .pipe(ngAnnotate())
    .pipe(concat('app.js'))
    .pipe(logUtils.concatenatedFiles('JS'))
    .pipe(toProdBuild('assets'));
});

/**
 * Compiles `client/index.pug` to `build/production` and injects the required link and script tags.
 *
 * Note: the compiled HTML must be pretty-printed as the useref plugin
 * used later in this build chain does not work with one-line files.
 */
gulp.task('prod:index', [ 'prod:css', 'prod:js' ], function() {
  return gulpifySrc(src.index)
    .pipe(compilePug())
    .pipe(autoInject(dirs.prodBuild))
    .pipe(logProcessedFiles(dirs.prodBuild, 'pug', true))
    .pipe(toProdBuild());
});

/**
 * Parses build comments in `build/production/index.html` and concatenates the files within.
 *
 * @see https://www.npmjs.com/package/gulp-useref
 */
gulp.task('prod:useref', [ 'prod:index' ], function() {
  return gulpifySrc(src.prodIndex)
    .pipe(useref({
      searchPath: [ dirs.prodBuild, '.' ]
    }))
    .pipe(logUtils.userefFiles())
    .pipe(toProdBuild());
});

/**
 * Minifies the production stylesheets in `build/production`.
 */
gulp.task('prod:minify:css', [ 'prod:useref' ], function() {
  return gulpifySrc(src.prodCss)
    .pipe(logUtils.storeInitialSize('css'))
    .pipe(cssmin())
    .pipe(logUtils.minifiedFiles())
    .pipe(toProdBuild());
});

/**
 * Minifies the production HTML files in `build/production`.
 *
 * Note: this needs to be done after the `gulp:useref` task
 * as the useref plugin does not work with one-line files.
 */
gulp.task('prod:minify:html', [ 'prod:useref' ], function() {
  return gulpifySrc(src.prodHtml)
    .pipe(logUtils.storeInitialSize('html'))
    .pipe(minifyHtml())
    .pipe(logUtils.minifiedFiles())
    .pipe(toProdBuild());
});

/**
 * Minifies the production JavaScript files in `build/production`.
 */
gulp.task('prod:minify:js', [ 'prod:useref' ], function() {
  return gulpifySrc(src.prodJs)
    .pipe(logUtils.storeInitialSize('js'))
    .pipe(uglify())
    .pipe(logUtils.minifiedFiles())
    .pipe(toProdBuild());
});

/**
 * Minifies production files in `build/production`.
 */
gulp.task('prod:minify', [ 'prod:minify:css', 'prod:minify:html', 'prod:minify:js' ]);

/**
 * Prepare all production assets for static revisioning.
 */
gulp.task('prod:unreved', [ 'prod:favicon', 'prod:fonts', 'prod:minify'  ]);

/**
 * Performs static asset revisioning on production assets in `build/production`.
 *
 * @see https://www.npmjs.com/package/gulp-rev
 * @see https://www.npmjs.com/package/gulp-rev-replace
 */
gulp.task('prod:rev', [ 'prod:unreved' ], function() {

  function relativeToAbsolutePath(filename) {
    return '/' + filename;
  }

  return gulpifySrc(src.prod)
    .pipe(filters.rev)
    .pipe(rev())
    .pipe(revDeleteOriginal())
    .pipe(logUtils.revedFiles())
    .pipe(toProdBuild())
    .pipe(filters.rev.restore)
    .pipe(logUtils.revReplacedFiles.fingerprint())
    .pipe(revReplace({
      modifyUnreved: relativeToAbsolutePath,
      modifyReved: relativeToAbsolutePath
    }))
    .pipe(logUtils.revReplacedFiles())
    .pipe(toProdBuild());
});

/**
 * Logs the total size of `build/production`.
 */
gulp.task('prod:size', function(callback) {
  getFolderSize(dirs.prodBuild, function(err, size) {
    if (err) {
      return callback(err);
    }

    util.log('Total size of ' + util.colors.magenta('build/production') + ' is ' + util.colors.bold(prettyBytes(size)));
    callback();
  });
});

/**
 * Runs the server with Nodemon and restarts it when changes to server files are detected.
 */
gulp.task('prod:nodemon', function() {
  return nodemon({
    script: 'bin/www',
    ext: 'js',
    watch: [ 'bin/www', 'config/**/*.js', 'server/**/*.js' ],
    ignore: [ '.git', 'client', 'node_modules' ],
    stdout: false
  }).on('readable', function() {
    this.stdout.pipe(process.stdout);
    this.stderr.pipe(process.stderr);
  });
});

/**
 * Builds the production application:
 *
 * * Load the local environment file if it exists.
 * * Set the environment to production.
 * * Clean up the production build directory.
 * * Build, concatenate and minify all production files (favicon, fonts, JavaScript, Less stylesheets, Stylus stylesheets, Pug templates).
 * * Perform static asset revisioning.
 * * Log the total size of the production build directory.
 */
gulp.task('prod:build', sequence('local:env', 'prod:env', 'clean:prod', 'prod:rev', 'prod:size'));

/**
 * Builds and runs the production environment:
 *
 * * Execute `prod:build`.
 * * Run the production server.
 * * Open the browser.
 */
gulp.task('prod:run', sequence('prod:build', [ 'prod:nodemon', 'open' ]));

/**
 * Alias of `prod:run`.
 */
gulp.task('prod', sequence('prod:run'));

// Default Task
// ------------

gulp.task('default', [ 'dev' ]);

// Reusable pipe chains
// --------------------

function autoInject(dest) {
  return chain(function(stream) {

    var config = getConfig();

    function injectFactory(files) {
      return inject(gulpifySrc(files, { read: false }), { ignorePath: dest });
    }

    return gulpifySrc(stream)
      .pipe(injectFactory(injections[config.env].js))
      .pipe(injectFactory(injections[config.env].css));
  })();
}

function compileLess() {
  return chain(function(stream) {
    return stream
      .pipe(less({
        paths: [ 'client', 'node_modules' ]
      }));
  })();
}

function compilePug(stream) {
  return chain(function(stream) {
    return stream
      .pipe(pug({
        locals: getConfig(),
        pretty: true
      }))
      .on('error', util.log);
  })();
}

function compileStylus() {
  return chain(function(stream) {
    return stream
      .pipe(stylus())
      .pipe(autoPrefixer());
  })();
}

function lint() {
  return chain(function(stream) {
    return stream
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'));
  })();
}

function minifyHtml() {
  return chain(function(stream) {
    return stream
      .pipe(htmlmin({
        caseSensitive: true,
        collapseWhitespace: true,
        removeComments: true
      }));
  })();
}

function toDevBuild(dir) {
  var dest = path.normalize(path.join(dirs.devBuild, dir || '.'));
  return chain(function(stream) {
    return stream
      .pipe(gulp.dest(dest))
      .pipe(livereload());
  })();
}

function toProdBuild(dir) {
  return gulp.dest(path.normalize(path.join(dirs.prodBuild, dir || '.')));
}

// Utility functions
// -----------------

var _config;
function getConfig() {
  if (!_config) {
    _config = require('./config');
  }

  return _config;
}

function changedFileSrc(file, base) {
  return gulpifySrc({ files: file.path, base: base });
}

/**
 * Returns a gulp task definition function that will use the run-sequence gulp plugin
 * to run the specified tasks in a specific order. Useful to define complex task aliases.
 *
 * @param {...String,Array} names - A sequence of task names (tasks to run in sequence) and task name arrays (tasks to run in parallel).
 * @returns {Function} A gulp task definition function.
 *
 * @example
 * // The `dev` task defined below will first run `foo`, then `bar` and `baz` in parallel, then `qux`.
 * gulp.task('dev', taskUtils.sequence('foo', [ 'bar', 'baz' ], 'qux'));
 */
function sequence() {
  var tasks = Array.prototype.slice.call(arguments);
  return function(callback) {
    return runSequence.apply(undefined, [].concat(tasks).concat([ callback ]));
  };
}

function wrapTemplate() {

  var templateWrapper = _.template(fs.readFileSync('client/template-cache.hbs', { encoding: 'utf-8' }));

  return through.obj(function(file, enc, callback) {
    if (file.isStream()) {
      return callback(new PluginError('gulp-wrap-template', 'Streaming not supported'));
    }

    var config = getConfig();

    var templateUrl = '/assets/' + path.relative('client', file.path);
    file.path = file.path.replace(/\.html$/, '.template.js');

    if (file.isBuffer()) {
      try {
        file.contents = new Buffer(templateWrapper({
          angularModule: JSON.stringify(config.mainAngularModule),
          templateUrl: JSON.stringify(templateUrl),
          templateContents: JSON.stringify(file.contents.toString())
        }));
      } catch(e) {
        e.message = 'Slim template error in ' + path.relative(config.root, file.path) + '; ' + e.message;
        return callback(new PluginError('gulp-wrap-template', e));
      }
    }

    callback(null, file);
  });
}

function openBrowser(target) {

  var stream = gulp.src(__filename);

  var config = getConfig();
  if (!config.open) {
    return stream;
  }

  var openOptions = {};
  if (config.openBrowser) {
    openOptions.app = config.openBrowser;
  }

  if (_.isString(target)) {
    openOptions.uri = target;
  } else if (_.isFunction(target.pipe)) {
    stream = target;
  } else {
    throw new Error('Only a file stream or an URL can be opened');
  }

  return stream.pipe(open(openOptions));
}

/**
 * Compares CSS stylesheets so that `.base.js` files appear first in a directory.
 */
function compareStylesheets(f1, f2) {

  // Perform a standard comparison if one or both files are not CSS.
  if (!isCss(f1) || !isCss(f2)) {
    return f1.path.localeCompare(f2.path);
  }

  var f1Dir = path.dirname(f1.path),
      f1Base = isBaseStylesheet(f1),
      f2Dir = path.dirname(f2.path),
      f2Base = isBaseStylesheet(f2);

  if (f1Dir.indexOf(f2Dir + path.sep) === 0) {
    // If f1 is in a subdirectory of f2's directory, place f1 last.
    return 1;
  } else if (f2Dir.indexOf(f1Dir + path.sep) === 0) {
    // If f2 is in a subdirectory of f1's directory, place f1 first.
    return -1;
  } else if (f1Dir != f2Dir || f1Base == f2Base) {
    // Perform a standard comparison if the files are not in the same directory,
    // if both are base stylesheets, or if both are not base stylesheets.
    return f1.path.localeCompare(f2.path);
  } else if (f1Base) {
    return -1;
  } else {
    return 1;
  }
}

/**
 * Compares JavaScript files so that `.module.js` files appear first in a directory.
 */
function compareAngularFiles(f1, f2) {

  // Perform a standard comparison if one or both files are not JavaScript.
  if (!isJs(f1) || !isJs(f2)) {
    return f1.path.localeCompare(f2.path);
  }

  var f1Dir = path.dirname(f1.path),
      f1Module = isAngularModule(f1),
      f2Dir = path.dirname(f2.path),
      f2Module = isAngularModule(f2);

  if (f1Dir.indexOf(f2Dir + path.sep) === 0) {
    // If f1 is in a subdirectory of f2's directory, place f1 last.
    return 1;
  } else if (f2Dir.indexOf(f1Dir + path.sep) === 0) {
    // If f2 is in a subdirectory of f1's directory, place f1 first.
    return -1;
  } else if (f1Dir != f2Dir || f1Module == f2Module) {
    // Perform a standard comparison if the files are not in the same directory,
    // if both are Angular modules, or if both are not Angular modules.
    return f1.path.localeCompare(f2.path);
  } else if (f1Module) {
    // If f1 is an Angular module and f2 is not, place f1 first.
    return -1;
  } else {
    // If f1 is not an Angular module and f2 is, place f1 last.
    return 1;
  }
}

function isCss(file) {
  return !!file.path.match(/\.css$/);
}

function isBaseStylesheet(file) {
  return !!file.path.match(/\.base\.css$/);
}

function isJs(file) {
  return !!file.path.match(/\.js$/);
}

function isAngularModule(file) {
  return !!file.path.match(/\.module\.js$/);
}
