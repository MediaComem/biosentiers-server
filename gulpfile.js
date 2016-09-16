var _ = require('lodash'),
    addSrc = require('gulp-add-src'),
    apidoc = require('gulp-apidocjs'),
    autoPrefixer = require('gulp-autoprefixer'),
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
    run = require('gulp-run'),
    streamQueue = require('streamqueue'),
    stylus = require('gulp-stylus'),
    through = require('through2'),
    uglify = require('gulp-uglify'),
    util = require('gulp-util'),
    yaml = require('js-yaml');

// Custom utilities.
var logUtils = require('./lib/gulp-log-utils'),
    srcUtils = require('./lib/gulp-src-utils'),
    taskUtils = require('./lib/gulp-task-utils');

// Often-used functions in this file.
var gulpifySrc = srcUtils.gulpify,
    PluginError = util.PluginError,
    sequence = taskUtils.sequence,
    taskBuilder = taskUtils.taskBuilder,
    watchSrc = srcUtils.watch,
    watchTaskBuilder = taskUtils.watchTaskBuilder;

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
  return gulpOpen('./doc/api/index.html')
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
  return taskBuilder(src.favicon)
    .pipe(logUtils.processedFiles('build/development'))
    .add(pipeDevFiles)
    .stream();
});

/**
 * Copies font dependencies defined in `client/dependencies.yml` to `build/development/assets/fonts`.
 */
gulp.task('dev:fonts', function() {

  var dependencies = getDependencies('fonts');

  return taskBuilder(dependencies)
    .pipe(logUtils.processedFiles('build/development/assets'))
    .add(pipeDevAssetsFactory('fonts'))
    .stream();
});

/**
 * Compiles the Less stylesheets in `client` to `build/development/assets`.
 */
gulp.task('dev:less', function() {
  return taskBuilder(src.less)
    .pipe(logUtils.processedFiles('build/development/assets', 'less', 'css'))
    .add(pipeCompileLess)
    .add(pipeDevAssets)
    .stream();
});

/**
 * Runs the project's JavaScript files through JSHint.
 */
gulp.task('dev:lint', function() {
  return taskBuilder(src.lintJs)
    .add(pipeLint)
    .stream();
});

/**
 * Compiles the Pug templates in `client` to `build/development`.
 */
gulp.task('dev:pug:templates', function() {
  return taskBuilder(src.templates)
    .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
    .add(pipeCompilePug)
    .add(pipeDevFiles)
    .stream();
});

/**
 * Compiles `client/index.pug` to `build/development` and injects the required link and script tags.
 * Stylesheets and scripts are sorted with custom functions to ensure they are in the correct order.
 */
gulp.task('dev:pug:index', function() {
  return taskBuilder(src.index)
    .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
    .add(pipeCompilePug)
    .add(pipeInjectFactory('build/development'))
    .add(pipeDevFiles)
    .stream();
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
  return taskBuilder(src.styl)
    .pipe(logUtils.processedFiles('build/development/assets', 'styl', 'css'))
    .add(pipeCompileStylus)
    .add(pipeDevAssets)
    .stream();
});

/**
 * Watches `client/dependencies.yml` and automatically re-injects the required link and script tags in the index when changes are detected.
 */
gulp.task('dev:watch:dependencies', function() {
  return srcUtils.watch(src.dependencies, function(file) {
    clearDependenciesCache();
    return taskBuilder(src.compiledIndex)
      .add(pipeInjectFactory('build/development'))
      .add(pipeDevFiles)
      .stream();
  });
});

/**
 * Watches the Less files in `client` and automatically compiles them to `build/development/assets` when changes are detected.
 */
gulp.task('dev:watch:less', function() {
  return srcUtils.watch(src.less, function(file) {
    return watchTaskBuilder(file, 'client')
      .pipe(logUtils.processedFiles('build/development/assets', 'less', 'css'))
      .add(pipeCompileLess)
      .add(pipeDevAssets)
      .stream();
  });
});

/**
 * Watches the project's JavaScript files and automatically runs them through JSHint when changes are detected.
 */
gulp.task('dev:watch:lint', function() {
  return srcUtils.watch(src.lintJs, function(file) {
    return taskBuilder(file.path)
      .add(pipeLint)
      .on('error', _.noop)
      .stream();
  });
});

/**
 * Watches the Pug templates in `client` and automatically compiles them to `build/development` when changes are detected.
 */
gulp.task('dev:watch:pug:templates', function() {
  return srcUtils.watch(src.templates, function(file) {
    return watchTaskBuilder(file, 'client')
      .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
      .add(pipeCompilePug)
      .add(pipeDevFiles)
      .stream();
  });
});

/**
 * Watches `client/index.pug` and automatically compiles it and injects the required link and script tags when changes are detected.
 */
gulp.task('dev:watch:pug:index', function() {
  return srcUtils.watch(src.index, function(file) {
    return watchTaskBuilder(file, 'client')
      .pipe(logUtils.processedFiles('build/development', 'pug', 'html'))
      .add(pipeCompilePug)
      .add(pipeInjectFactory('build/development'))
      .add(pipeDevFiles)
      .stream();
  });
});

/**
 * Watches the Stylus files in `client` and automatically compiles them to `build/development/assets` when changes are detected.
 */
gulp.task('dev:watch:stylus', function() {
  return srcUtils.watch(src.styl, function(file) {
    return watchTaskBuilder(file, 'client')
      .pipe(logUtils.processedFiles('build/development/assets', 'styl', 'css'))
      .add(pipeCompileStylus)
      .add(pipeDevAssets)
      .stream();
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

  var lessSrc = taskBuilder(src.less)
    .add(pipeCompileLess)
    .stream();

  var stylusSrc = taskBuilder(src.styl)
    .add(pipeCompileStylus)
    .stream();

  return taskBuilder(merge(lessSrc, stylusSrc))
    .add(srcUtils.pipeSortFactory(compareStylesheets))
    .pipe(addSrc.prepend(getDependencies('css')))
    .pipe(concat('app.css'))
    .pipe(logUtils.storeInitialSize('css'))
    .pipe(cssmin())
    .add(pipeProdAssets)
    .stream();
});

/**
 * Copies font dependencies defined in `client/dependencies.yml` to `build/production/assets/fonts`.
 */
gulp.task('prod:fonts', function() {

  var dependencies = getDependencies('fonts');

  return taskBuilder(dependencies)
    .add(pipeProdAssetsFactory('fonts'))
    .stream();
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
  var codeSrc = taskBuilder(src.js).stream();

  // Wrapped templates.
  var templatesSrc = taskBuilder(src.templates)
    .add(pipeCompilePug)
    .pipe(wrapTemplateFactory())
    .stream();

  return taskBuilder(streamQueue({ objectMode: true }, codeSrc, templatesSrc))
    .pipe(ngAnnotate())
    .pipe(concat('app.js'))
    .pipe(logUtils.storeInitialSize('js'))
    .pipe(uglify())
    .add(pipeProdAssets)
    .stream();
});

/**
 * Compiles `client/index.pug` to `build/production` and injects the required link and script tags.
 * Stylesheets and scripts are sorted with custom functions to ensure they are in the correct order.
 * All HTML comments are removed.
 */
gulp.task('prod:index', function() {
  return taskBuilder(src.index)
    .add(pipeCompilePug)
    .add(pipeInjectFactory('build/production'))
    .pipe(logUtils.storeInitialSize('html'))
    .pipe(removeHtmlComments())
    .add(pipeProdFiles)
    .stream();
});

/**
 * Copies `client/favicon.ico` to `build/production`.
 */
gulp.task('prod:favicon', function() {
  return taskBuilder(src.favicon)
    .add(pipeProdFiles)
    .stream();
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
  return taskBuilder(src.prod)
    .pipe(filters.rev)
    .pipe(rev())
    .pipe(filters.rev.restore)
    .add(pipeProdFiles)
    .pipe(revDeleteOriginal())
    .pipe(rev.manifest())
    .pipe(gulp.dest('tmp/production'))
    .stream();
});

/**
 * Replaces references to rev'd production assets in `build/production`.
 */
gulp.task('prod:rev:replace', function() {

  function relativeToAbsolutePath(filename) {
    return '/' + filename;
  }

  return taskBuilder(src.prod)
    .pipe(revReplace({
      manifest: gulp.src('tmp/production/rev-manifest.json'),
      modifyUnreved: relativeToAbsolutePath,
      modifyReved: relativeToAbsolutePath
    }))
   .pipe(gulp.dest('build/production'))
   .stream();
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

function pipeInjectFactory(dest) {
  return function(src) {

    var config = getConfig();

    function autoInject(files) {
      return inject(gulpifySrc(files, { read: false }), { ignorePath: dest });
    }

    return taskBuilder(src)
      .pipe(autoInject(injections[config.env].js))
      .pipe(autoInject(injections[config.env].css))
      .stream();
  };
}

function pipeCompileLess(src) {
  return src
    .pipe(less({
      paths: [ 'client', 'node_modules' ]
    }));
}

function pipeCompileStylus(src) {
  return src
    .pipe(stylus())
    .pipe(autoPrefixer());
}

function pipeLint(src) {
  return src
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
}

function pipeDevFiles(src, dest) {
  return src
    .pipe(gulp.dest(dest || 'build/development'))
    .pipe(livereload());
}

function pipeDevAssets(src, dest) {
  return src
    .pipe(gulp.dest(dest || 'build/development/assets'))
    .pipe(livereload());
}

function pipeDevAssetsFactory(dir, dest) {
  return function(src) {
    return pipeDevAssets(src, path.join(dest || 'build/development/assets', dir));
  };
}

function pipeProdFiles(src, dest) {
  return src
    .pipe(gulp.dest(dest || 'build/production'))
    .pipe(logUtils.productionFiles('build/production'));
}

function pipeProdAssets(src, dest) {
  return src
    .pipe(gulp.dest(dest || 'build/production/assets'))
    .pipe(logUtils.productionFiles('build/production'));
}

function pipeProdAssetsFactory(dir, dest) {
  return function(src) {
    return pipeProdAssets(src, path.join(dest || 'build/production/assets', dir));
  };
}

function pipeCompilePug(src) {

  var config = getConfig();

  return src
    .pipe(pug({
      locals: config,
      pretty: config.env != 'production'
    }))
    .on('error', util.log);
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
