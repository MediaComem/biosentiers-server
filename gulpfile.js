var _ = require('lodash'),
    addSrc = require('gulp-add-src'),
    autoPrefixer = require('gulp-autoprefixer'),
    clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    cssmin = require('gulp-cssmin'),
    env = require('gulp-env'),
    fs = require('fs'),
    getFolderSize = require('get-folder-size'),
    gulp = require('gulp'),
    inject = require('gulp-inject'),
    jshint = require('gulp-jshint'),
    livereload = require('gulp-livereload'),
    nodemon = require('gulp-nodemon'),
    open = require('gulp-open'),
    path = require('path'),
    prettyBytes = require('pretty-bytes'),
    pug = require('gulp-pug'),
    rev = require('gulp-rev'),
    removeHtmlComments = require('gulp-remove-html-comments'),
    runSequence = require('run-sequence'),
    sort = require('gulp-sort'),
    stable = require('stable'),
    stylus = require('gulp-stylus'),
    through = require('through2'),
    uglify = require('gulp-uglify'),
    util = require('gulp-util'),
    watch = require('gulp-watch'),
    yaml = require('js-yaml');

var PluginError = util.PluginError;

// Configuration
// -------------

var files = {
  js: [
    'client/**/*.js'
  ],
  css: [
    'build/development/assets/**/*.css'
  ]
};

var src = {
  assets: { files: 'assets.yml', cwd: 'client' },
  index: { files: 'index.pug', cwd: 'client' },
  compiledIndex: { files: 'index.html', cwd: 'build/development' },
  templates: { files: [ '*/**/*.pug' ], cwd: 'client' },
  favicon: { files: 'client/favicon.ico' },
  styl: { files: '**/*.styl', cwd: 'client' },
  js: assetsSrcFactory('js', { files: files.js, compare: compareAngularFiles }),
  allCustomJs: { files: [ 'bin/www', 'config/**/*.js', 'gulpfile.js' ].concat(files.js) },
  css: assetsSrcFactory('css', files.css)
};

var injections = {
  development: {
    js: src.js,
    css: src.css
  },
  production: {
    js: { files: [ 'build/production/assets/**/*.js' ] },
    css: { files: [ 'build/production/assets/**/*.css' ] }
  }
};

// Cleanup Tasks
// -------------

gulp.task('clean:dev', function() {
  return gulp.src('build/development/*', { read: false })
    .pipe(clean());
});

gulp.task('clean:prod', function() {
  return gulp.src('build/production/*', { read: false })
    .pipe(clean());
});

gulp.task('clean:tmp', function() {
  return gulp.src('tmp/*', { read: false })
    .pipe(clean());
});

gulp.task('clean', [ 'clean:dev', 'clean:prod', 'clean:tmp' ]);

// Development Tasks
// -----------------

gulp.task('dev:copy:favicon', function() {
  return taskBuilder(src.favicon)
    .pipe(logFactory('build/development'))
    .add(pipeDevFiles)
    .end();
});

gulp.task('dev:copy', [ 'dev:copy:favicon' ]);

gulp.task('dev:env', function() {

  var localEnv;
  try {
    localEnv = require('./config/local.env');
  } catch (err) {
    localEnv = {};
  }

  env.set(localEnv);
});

gulp.task('dev:lint', function() {
  return taskBuilder(src.allCustomJs)
    .add(pipeLint)
    .end();
});

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

gulp.task('dev:open', function() {

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

gulp.task('dev:pug:templates', function() {
  return taskBuilder(src.templates)
    .pipe(logFactory('build/development', 'pug', 'html'))
    .add(pipeCompilePug)
    .add(pipeDevFiles)
    .end();
});

gulp.task('dev:pug:index', function() {
  return taskBuilder(src.index)
    .pipe(logFactory('build/development', 'pug', 'html'))
    .add(pipeCompilePug)
    .add(pipeAutoInjectFactory('build/development'))
    .add(pipeDevFiles)
    .end();
});

gulp.task('dev:pug', [ 'dev:pug:templates', 'dev:pug:index' ]);

gulp.task('dev:stylus', function() {
  return taskBuilder(src.styl)
    .pipe(logFactory('build/development/assets', 'styl', 'css'))
    .add(pipeCompileStylus)
    .add(pipeDevAssets)
    .end();
});

gulp.task('dev:compile', sequence('clean:dev', [ 'dev:copy', 'dev:pug:templates', 'dev:stylus' ], 'dev:pug:index'));

gulp.task('dev:watch:assets', function() {
  return watchSrc(src.assets, function(file) {
    clearAssetsCache();
    return taskBuilder(src.compiledIndex)
      .add(pipeAutoInjectFactory('build/development'))
      .add(pipeDevFiles)
      .end();
  });
});

gulp.task('dev:watch:lint', function() {
  return watchSrc(src.allCustomJs, function(file) {
    return taskBuilder(file.path)
      .add(pipeLint)
      .on('error', _.noop)
      .end();
  });
});

gulp.task('dev:watch:pug:templates', function() {
  return watchSrc(src.templates, function(file) {
    return watchTaskBuilder(file, 'client')
      .pipe(logFactory('build/development', 'pug', 'html'))
      .add(pipeCompilePug)
      .add(pipeDevFiles)
      .end();
  });
});

gulp.task('dev:watch:pug:index', function() {
  return watchSrc(src.index, function(file) {
    return watchTaskBuilder(file, 'client')
      .pipe(logFactory('build/development', 'pug', 'html'))
      .add(pipeCompilePug)
      .add(pipeAutoInjectFactory('build/development'))
      .add(pipeDevFiles)
      .end();
  });
});

gulp.task('dev:watch:stylus', function() {
  return watchSrc(src.styl, function(file) {
    return watchTaskBuilder(file, 'client')
      .pipe(logFactory('build/development/assets', 'styl', 'css'))
      .add(pipeCompileStylus)
      .add(pipeDevAssets)
      .end();
  });
});

gulp.task('dev:watch', [ 'dev:watch:assets', 'dev:watch:lint', 'dev:watch:pug:templates', 'dev:watch:pug:index', 'dev:watch:stylus' ]);

gulp.task('dev', sequence('dev:env', 'clean:dev', 'dev:compile', [ 'dev:nodemon', 'dev:watch', 'dev:open' ]));

// Production Tasks
// ----------------

gulp.task('prod:env', function() {
  env.set({
    NODE_ENV: 'production'
  });
});

gulp.task('prod:css', function() {
  return taskBuilder(src.styl)
    .add(pipeCompileStylus)
    .pipe(addSrc.prepend(getAssets('css')))
    .pipe(concat('app.css'))
    .pipe(storeProdInitialSizeFactory('css'))
    .pipe(cssmin())
    .add(pipeProdAssets)
    .end();
});

gulp.task('prod:js', function() {
  return taskBuilder(src.js)
    .pipe(concat('app.js'))
    .pipe(storeProdInitialSizeFactory('js'))
    .pipe(uglify())
    .add(pipeProdAssets)
    .end();
});

gulp.task('prod:index', function() {
  return taskBuilder(src.index)
    .add(pipeCompilePug)
    .add(pipeAutoInjectFactory('build/production'))
    .pipe(storeProdInitialSizeFactory('html'))
    .pipe(removeHtmlComments())
    .add(pipeProdFiles)
    .end();
});

gulp.task('prod:favicon', function() {
  return taskBuilder(src.favicon)
    .add(pipeProdFiles)
    .end();
});

gulp.task('prod:size', function(callback) {
  getFolderSize('build/production', function(err, size) {
    if (err) {
      return callback(err);
    }

    util.log(util.colors.blue('build/production - ' + prettyBytes(size)));
    callback();
  });
});

gulp.task('prod', sequence('prod:env', [ 'clean:prod', 'clean:tmp' ], [ 'prod:css', 'prod:favicon', 'prod:js' ], 'prod:index', 'prod:size'));

// Default Task
// ------------

gulp.task('default', [ 'dev' ]);

// Reusable piping functions
// -------------------------

function pipeAutoInjectFactory(dest) {
  return function(src) {

    var config = getConfig();

    function autoInject(files) {
      return inject(gulpifySrc(files, { read: false }), { ignorePath: dest });
    }

    return taskBuilder(src)
      .pipe(autoInject(injections[config.env].js))
      .pipe(autoInject(injections[config.env].css))
      .end();
  };
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

function pipeDevFiles(src, dir) {
  return src
    .pipe(gulp.dest('build/development'))
    .pipe(livereload());
}

function pipeDevAssets(src) {
  return src
    .pipe(gulp.dest('build/development/assets'))
    .pipe(livereload());
}

function pipeProdFiles(src) {
  return src
    .pipe(gulp.dest('build/production'))
    .pipe(logProdFactory());
}

function pipeProdAssets(src) {
  return src
    .pipe(rev())
    .pipe(gulp.dest('build/production/assets'))
    .pipe(logProdFactory());
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

var _assets;
function getAssets(type) {
  if (!_assets) {
    var config = getConfig();
    _assets = yaml.safeLoad(fs.readFileSync('client/assets.yml', 'utf-8'));
  }

  return type ? _assets[type] : _assets;
}

function clearAssetsCache() {
  _assets = null;
}

function assetsSrcFactory(type, src, options) {
  return function(additionalOptions) {
    return gulpifySrc(src, _.extend({}, src, options, additionalOptions))
      .pipe(addSrc.prepend(getAssets(type)));
  };
}

function logFactory(to, fromExt, toExt, from) {
  if (!from) {
    from = 'client';
  }

  return through.obj(function(file, enc, callback) {

    var relativePath = path.relative(from, file.path),
        fromPath = path.join(from, relativePath),
        toPath = path.join(to, relativePath);

    if (fromExt && toExt) {
      toPath = toPath.replace(new RegExp('\\.' + fromExt + '$'), '.' + toExt);
    }

    util.log(util.colors.cyan(fromPath) + ' -> ' + util.colors.cyan(toPath));

    callback(null, file);
  });
}

var sizes = {};

function storeProdInitialSizeFactory(name) {
  sizes[name] = 0;

  return through.obj(function(file, enc, callback) {
    sizes[name] += file.contents.length;
    callback(null, file);
  });
}

function logProdFactory(name) {
  return through.obj(function(file, enc, callback) {

    var relativePath = path.relative('build/production', file.path),
        toPath = path.join('build/production', relativePath);

    var size = prettyBytes(file.contents.length);

    var name = toPath.replace(/.*\./, '');
    if (sizes[name]) {
      size = prettyBytes(sizes[name]) + ' -> ' + size;
    }

    util.log(util.colors.blue(toPath + ' - ' + size));

    callback(null, file);
  });
}

function sequence() {
  var tasks = Array.prototype.slice.call(arguments);
  return function(callback) {
    return runSequence.apply(undefined, [].concat(tasks).concat([ callback ]));
  };
}

function gulpifySrc(src, options) {
  if (_.isFunction(src)) {
    return src(options);
  }

  var files;
  if (_.isString(src) || _.isArray(src)) {
    files = src;
  } else if (_.isFunction(src)) {
    files = src();
  } else if (_.has(src, 'files')) {
    files = src.files;
  } else {
    throw new Error('Source of type ' + typeof(src) + ' cannot be gulpified');
  }

  var gulpOptions = _.extend({}, src, options),
      gulpSrc = gulp.src(files, getSrcOptions(gulpOptions));

  if (_.isFunction(gulpOptions.compare)) {
    gulpSrc = gulpSrc.pipe(sort({
      customSortFn: function(files) {
        return stable(files, gulpOptions.compare);
      }
    }));
  }

  return gulpSrc;
}

function getSrcOptions(src) {
  return _.pick(src, 'base', 'cwd');
}

function taskBuilder(src) {
  return new TaskBuilder(src);
}

function TaskBuilder(src) {
  if (_.isFunction(src.pipe)) {
    this.src = src;
  } else {
    this.src = gulpifySrc(src);
  }
}

TaskBuilder.prototype.add = function(func) {
  this.src = func(this.src);
  return this;
};

TaskBuilder.prototype.pipe = function(func) {
  this.src = this.src.pipe(func);
  return this;
};

TaskBuilder.prototype.on = function() {
  var args = Array.prototype.slice.call(arguments);
  this.src = this.src.on.apply(this.src, args);
  return this;
};

TaskBuilder.prototype.end = function() {
  return this.src;
};

function watchSrc(src, callback) {
  return watch(src.files, getSrcOptions(src), callback);
}

function watchTaskBuilder(file, base) {
  return taskBuilder({ files: file.path, base: base });
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

function isJs(file) {
  return !!file.path.match(/\.js$/);
}

function isAngularModule(file) {
  return !!file.path.match(/\.module\.js$/);
}
