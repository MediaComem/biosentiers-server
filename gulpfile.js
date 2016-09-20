var _ = require('lodash'),
    addSrc = require('gulp-add-src'),
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
    removeHtmlComments = require('gulp-remove-html-comments'),
    runSequence = require('run-sequence'),
    streamQueue = require('streamqueue'),
    stylus = require('gulp-stylus'),
    through = require('through2'),
    uglify = require('gulp-uglify'),
    util = require('gulp-util'),
    yaml = require('js-yaml');

// Custom utilities.
var logUtils = require('./lib/gulp-log-utils'),
    srcUtils = require('./lib/gulp-src-utils');

// Often-used functions in this file.
var gulpifySrc = srcUtils.gulpify,
    PluginError = util.PluginError,
    watchSrc = srcUtils.watch;

// Configuration
// -------------

var src = {
  // Dependencies manifest.
  dependencies: { files: 'dependencies.yml', cwd: 'client' },
  // Pug templates.
  index: { files: 'index.pug', cwd: 'client' },
  compiledIndex: { files: 'index.html', cwd: 'build/development' },
  templates: { files: [ '*/**/*.pug' ], cwd: 'client' },
  // Favicon.
  favicon: { files: 'client/favicon.ico' },
  // Less files to compile to CSS.
  less: { files: '**/*.less', cwd: 'client' },
  // Stylus files to compile to CSS.
  styl: { files: '**/*.styl', cwd: 'client' },
  // Client assets.
  js: assetsWithDependenciesFactory('js', { files: 'client/**/*.js', compare: compareAngularFiles }),
  css: assetsWithDependenciesFactory('css', { files: 'build/development/assets/**/*.css', compare: compareStylesheets }),
  // JavaScript to check with JSHint.
  lintJs: { files: [ 'bin/www', 'config/**/*.js', 'gulpfile.js', 'client/**/*.js' ] },
  // Production build files.
  prod: { files: '**/*', cwd: 'build/production' }
};

var injections = {
  // Files to inject into index.html in development mode.
  development: {
    js: src.js,
    css: src.css
  },
  // Files to inject into index.html in production mode.
  production: {
    js: { files: [ 'build/production/assets/**/*.js' ] },
    css: { files: [ 'build/production/assets/**/*.css' ] }
  }
};

var filters = {
  // Filter to select files that should be rev'd
  // (a hash of their contents will be added to their filename for static revisioning).
  rev: filter([ '**/*', '!index.html', '!favicon.ico' ], { restore: true })
};

// Cleanup Tasks
// -------------

gulp.task('clean:dev', function() {
  return gulp.src('build/development/*', { read: false })
    .pipe(clean());
});

gulp.task('clean:prod', function() {
  return gulp.src([ 'build/production/*', 'tmp/production/*' ], { read: false })
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
  return gulpOpen('./doc/api/index.html');
});

/**
 * Generates and opens the project's documentation.
 */
gulp.task('doc', sequence('doc:api', 'doc:api:open'));

/**
 * Opens the URL of the running server in the browser.
 */
gulp.task('open', function() {

  var config = getConfig();
  if (!config.open) {
    return;
  }

  var openOptions = {
    uri: config.url
  };

  if (config.openBrowser) {
    openOptions.app = config.openBrowser;
  }

  return gulp.src(__filename)
    .pipe(open(openOptions));
});

/**
 * Loads the environment variables defined in `config/local.env.js` (if the file exists).
 */
gulp.task('local:env', function() {

  var localEnv;
  try {
    localEnv = require('./config/local.env');
  } catch (err) {
    localEnv = {};
  }

  env.set(localEnv);
});

// Development Tasks
// -----------------

/**
 * Copies `client/favicon.ico` to `build/development`.
 */
gulp.task('dev:favicon', function() {
  return gulpifySrc(src.favicon)
    .pipe(logUtils.processedFiles('build/development'))
    .pipe(pipeDevFiles());
});

/**
 * Copies font dependencies defined in `client/dependencies.yml` to `build/development/assets/fonts`.
 */
gulp.task('dev:fonts', function() {

  var dependencies = getDependencies('fonts');

  return gulpifySrc(dependencies)
    .pipe(logUtils.processedFiles('build/development/assets'))
    .pipe(pipeDevAssetsFactory('fonts'));
});

/**
 * Compiles the Less stylesheets in `client` to `build/development/assets`.
 */
gulp.task('dev:less', function() {
  return gulpifySrc(src.less)
    .pipe(logUtils.processedFiles('build/development/assets', 'less', 'css'))
    .pipe(pipeCompileLess())
    .pipe(pipeDevAssets());
});

/**
 * Runs the project's JavaScript files through JSHint.
 */
gulp.task('dev:lint', function() {
  return gulpifySrc(src.lintJs)
    .pipe(pipeLint());
});

/**
 * Compiles the Pug templates in `client` to `build/development`.
 */
gulp.task('dev:pug:templates', function() {
  return gulpifySrc(src.templates)
    .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
    .pipe(pipeCompilePug())
    .pipe(pipeDevFiles());
});

/**
 * Compiles `client/index.pug` to `build/development` and injects the required link and script tags.
 * Stylesheets and scripts are sorted with custom functions to ensure they are in the correct order.
 */
gulp.task('dev:pug:index', function() {
  return gulpifySrc(src.index)
    .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
    .pipe(pipeCompilePug())
    .pipe(pipeInject('build/development'))
    .pipe(pipeDevFiles());
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
    .pipe(logUtils.processedFiles('build/development/assets', 'styl', 'css'))
    .pipe(pipeCompileStylus())
    .pipe(pipeDevAssets());
});

/**
 * Watches `client/dependencies.yml` and automatically re-injects the required link and script tags in the index when changes are detected.
 */
gulp.task('dev:watch:dependencies', function() {
  return srcUtils.watch(src.dependencies, function(file) {
    clearDependenciesCache();
    return gulpifySrc(src.compiledIndex)
      .pipe(pipeInject('build/development'))
      .pipe(pipeDevFiles());
  });
});

/**
 * Watches the Less files in `client` and automatically compiles them to `build/development/assets` when changes are detected.
 */
gulp.task('dev:watch:less', function() {
  return srcUtils.watch(src.less, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(logUtils.processedFiles('build/development/assets', 'less', 'css'))
      .pipe(pipeCompileLess())
      .pipe(pipeDevAssets());
  });
});

/**
 * Watches the project's JavaScript files and automatically runs them through JSHint when changes are detected.
 */
gulp.task('dev:watch:lint', function() {
  return srcUtils.watch(src.lintJs, function(file) {
    return gulpifySrc(file.path)
      .pipe(pipeLint())
      .on('error', _.noop);
  });
});

/**
 * Watches the Pug templates in `client` and automatically compiles them to `build/development` when changes are detected.
 */
gulp.task('dev:watch:pug:templates', function() {
  return srcUtils.watch(src.templates, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
      .pipe(pipeCompilePug())
      .pipe(pipeDevFiles());
  });
});

/**
 * Watches `client/index.pug` and automatically compiles it and injects the required link and script tags when changes are detected.
 */
gulp.task('dev:watch:pug:index', function() {
  return srcUtils.watch(src.index, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
      .pipe(pipeCompilePug())
      .pipe(pipeInject('build/development'))
      .pipe(pipeDevFiles());
  });
});

/**
 * Watches the Stylus files in `client` and automatically compiles them to `build/development/assets` when changes are detected.
 */
gulp.task('dev:watch:stylus', function() {
  return srcUtils.watch(src.styl, function(file) {
    return changedFileSrc(file, 'client')
      .pipe(logUtils.processedFiles('build/development/assets', 'styl', 'css'))
      .pipe(pipeCompileStylus())
      .pipe(pipeDevAssets());
  });
});

/**
 * Builds all development files once:
 *
 * * Load the local environment file if it exists.
 * * Clean up the development build directory.
 * * Copy and compile all required files (favicon, fonts, Less stylesheets, Stylus stylesheets, Pug templates).
 */
gulp.task('dev:build', sequence('local:env', 'clean:dev', [ 'dev:favicon', 'dev:fonts', 'dev:less', 'dev:pug:templates', 'dev:stylus' ], 'dev:pug:index'));

/**
 * Runs all watch tasks (dependencies manifest, Less stylesheets, Stylus stylesheets, Pug templates and linting).
 */
gulp.task('dev:watch', [ 'dev:watch:dependencies', 'dev:watch:less', 'dev:watch:lint', 'dev:watch:pug:templates', 'dev:watch:pug:index', 'dev:watch:stylus' ]);

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
 * Builds the production CSS stylesheet:
 *
 * * Compile all stylesheets (Less & Stylus) and sort them in the correct order.
 * * Prepend all stylesheet dependencies.
 * * Concatenate all stylesheets into `app.css`.
 * * Minify `app.css`.
 * * Save `app.css` to `build/production/assets`.
 *
 * Static asset revisioning is performed later with the `prod:rev` and `prod:rev:replace` tasks.
 */
gulp.task('prod:css', function() {

  var lessSrc = gulpifySrc(src.less)
    .pipe(pipeCompileLess());

  var stylusSrc = gulpifySrc(src.styl)
    .pipe(pipeCompileStylus());

  return gulpifySrc(merge(lessSrc, stylusSrc))
    .pipe(srcUtils.pipeSortFactory(compareStylesheets))
    .pipe(addSrc.prepend(getDependencies('css')))
    .pipe(concat('app.css'))
    .pipe(logUtils.storeInitialSize('css'))
    .pipe(cssmin())
    .pipe(pipeProdAssets());
});

/**
 * Copies font dependencies defined in `client/dependencies.yml` to `build/production/assets/fonts`.
 */
gulp.task('prod:fonts', function() {

  var dependencies = getDependencies('fonts');

  return gulpifySrc(dependencies)
    .pipe(pipeProdAssetsFactory('fonts'));
});

/**
 * Builds the production JavaScript file:
 *
 * * Include all JavaScript sources.
 * * Compile all Pug templates (excluding the index) and wrap them into JavaScript files.
 * * Run all Angular files through ng-annotate.
 * * Concatenate all JavaScript into `app.js`.
 * * Uglify `app.js`.
 * * Save `app.js` to `build/production/assets`.
 *
 * Static asset revisioning is performed later with the `prod:rev` and `prod:rev:replace` tasks.
 */
gulp.task('prod:js', function() {

  // JavaScript sources (client & dependencies).
  var codeSrc = gulpifySrc(src.js);

  // Wrapped templates.
  var templatesSrc = gulpifySrc(src.templates)
    .pipe(pipeCompilePug())
    .pipe(wrapTemplateFactory());

  return gulpifySrc(streamQueue({ objectMode: true }, codeSrc, templatesSrc))
    .pipe(ngAnnotate())
    .pipe(concat('app.js'))
    .pipe(logUtils.storeInitialSize('js'))
    .pipe(uglify())
    .pipe(pipeProdAssets());
});

/**
 * Compiles `client/index.pug` to `build/production` and injects the required link and script tags.
 * Stylesheets and scripts are sorted with custom functions to ensure they are in the correct order.
 * All HTML comments are removed.
 */
gulp.task('prod:index', function() {
  return gulpifySrc(src.index)
    .pipe(pipeCompilePug())
    .pipe(pipeInject('build/production'))
    .pipe(logUtils.storeInitialSize('html'))
    .pipe(removeHtmlComments())
    .pipe(pipeProdFiles());
});

/**
 * Copies `client/favicon.ico` to `build/production`.
 */
gulp.task('prod:favicon', function() {
  return gulpifySrc(src.favicon)
    .pipe(pipeProdFiles());
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
 * Performs static asset revisioning on production assets in `build/production` (see https://github.com/sindresorhus/gulp-rev).
 * The rev manifest is stored in `tmp/production`.
 */
gulp.task('prod:rev', function() {
  return gulpifySrc(src.prod)
    .pipe(filters.rev)
    .pipe(rev())
    .pipe(filters.rev.restore)
    .pipe(pipeProdFiles())
    .pipe(revDeleteOriginal())
    .pipe(rev.manifest())
    .pipe(gulp.dest('tmp/production'));
});

/**
 * Replaces references to rev'd production assets in `build/production`.
 */
gulp.task('prod:rev:replace', function() {

  function relativeToAbsolutePath(filename) {
    return '/' + filename;
  }

  return gulpifySrc(src.prod)
    .pipe(revReplace({
      manifest: gulp.src('tmp/production/rev-manifest.json'),
      modifyUnreved: relativeToAbsolutePath,
      modifyReved: relativeToAbsolutePath
    }))
   .pipe(gulp.dest('build/production'));
});

/**
 * Logs the total size of `build/production`.
 */
gulp.task('prod:size', function(callback) {
  getFolderSize('build/production', function(err, size) {
    if (err) {
      return callback(err);
    }

    util.log(util.colors.blue('build/production - ' + prettyBytes(size)));
    callback();
  });
});

/**
 * Builds all production files once:
 *
 * * Load the local environment file if it exists.
 * * Set the environment to production.
 * * Clean up the production build directory.
 * * Copy and compile all required files (favicon, fonts, Less stylesheets, Stylus stylesheets, Pug templates).
 * * Perform static asset revisioning.
 * * Log the total size of the production build directory.
 */
gulp.task('prod:build', sequence('local:env', 'prod:env', 'clean:prod', [ 'prod:css', 'prod:favicon', 'prod:fonts', 'prod:js' ], 'prod:index', 'prod:rev', 'prod:rev:replace', 'prod:size'));

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

// Reusable pipe sequences
// -----------------------

function pipeInject(dest) {
  return chain(function(stream) {

    var config = getConfig();

    function autoInject(files) {
      return inject(gulpifySrc(files, { read: false }), { ignorePath: dest });
    }

    return gulpifySrc(stream)
      .pipe(autoInject(injections[config.env].js))
      .pipe(autoInject(injections[config.env].css));
  })();
}

function pipeCompileLess() {
  return chain(function(stream) {
    return stream
      .pipe(less({
        paths: [ 'client', 'node_modules' ]
      }));
  })();
}

function pipeCompileStylus() {
  return chain(function(stream) {
    return stream
      .pipe(stylus())
      .pipe(autoPrefixer());
  })();
}

function pipeLint() {
  return chain(function(stream) {
    return stream
      .pipe(jshint())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'));
  })();
}

function pipeDevFiles(stream, dest) {
  return chain(function(stream) {
    return stream
      .pipe(gulp.dest(dest || 'build/development'))
      .pipe(livereload());
  })();
}

function pipeDevAssets(dest) {
  return chain(function(stream) {
    return stream
      .pipe(gulp.dest(dest || 'build/development/assets'))
      .pipe(livereload());
  })();
}

function pipeDevAssetsFactory(dir, dest) {
  return chain(function(stream) {
    return stream
      .pipe(pipeDevAssets(path.join(dest || 'build/development/assets', dir)));
  })();
}

function pipeProdFiles(dest) {
  return chain(function(stream) {
    return stream
      .pipe(gulp.dest(dest || 'build/production'))
      .pipe(logUtils.productionFiles('build/production'));
  })();
}

function pipeProdAssets(dest) {
  return chain(function(stream) {
    return stream
      .pipe(gulp.dest(dest || 'build/production/assets'))
      .pipe(logUtils.productionFiles('build/production'));
  })();
}

function pipeProdAssetsFactory(dir, dest) {
  return chain(function(stream) {
    return stream
      .pipe(pipeProdAssets(path.join(dest || 'build/production/assets', dir)));
  })();
}

function pipeCompilePug(stream) {

  var config = getConfig();

  return chain(function(stream) {
    return stream
      .pipe(pug({
        locals: config,
        pretty: config.env != 'production'
      }))
      .on('error', util.log);
  })();
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

var _dependencies;
function getDependencies(type) {
  if (!_dependencies) {
    var config = getConfig();
    _dependencies = yaml.safeLoad(fs.readFileSync('client/dependencies.yml', 'utf-8'));
  }

  return type ? _dependencies[type] : _dependencies;
}

function clearDependenciesCache() {
  _dependencies = null;
}

function assetsWithDependenciesFactory(type, src, options) {
  return function(additionalOptions) {
    return gulpifySrc(src, _.extend({}, src, options, additionalOptions))
      .pipe(addSrc.prepend(getDependencies(type)));
  };
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

var htmlTemplateWrapper = _.template("angular.module(<%= angularModule %>).run(function($templateCache) { $templateCache.put(<%= templateUrl %>, <%= templateContents %>); });");

function wrapTemplateFactory() {
  return through.obj(function(file, enc, callback) {
    if (file.isStream()) {
      return callback(new PluginError('gulp-wrap-template', 'Streaming not supported'));
    }

    var config = getConfig();

    var templateUrl = '/' + path.relative('client', file.path);
    file.path = file.path.replace(/\.html$/, '.js');

    if (file.isBuffer()) {
      try {
        file.contents = new Buffer(htmlTemplateWrapper({
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

function gulpOpen(target) {

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
    // If f1 is a base stylesheet and f2 is not, place f1 first.
    return -1;
  } else {
    // If f1 is not a base stylesheet and f2 is, place f1 last.
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
