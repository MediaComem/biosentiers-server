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
    livereload = require('gulp-livereload'),
    nodemon = require('gulp-nodemon'),
    path = require('path'),
    prettyBytes = require('pretty-bytes'),
    pug = require('gulp-pug'),
    rev = require('gulp-rev'),
    removeHtmlComments = require('gulp-remove-html-comments'),
    runSequence = require('run-sequence'),
    stylus = require('gulp-stylus'),
    through = require('through2'),
    uglify = require('gulp-uglify'),
    util = require('gulp-util'),
    watch = require('gulp-watch');

var PluginError = util.PluginError;

// Configuration
// -------------

var files = {
  js: [
    'node_modules/lodash/lodash.js'
  ],
  devJs: [
    'client/**/*.js'
  ],
  prodJs: [
    'tmp/production/assets/bundle.js'
  ],
  css: [
    'node_modules/bootstrap/dist/css/bootstrap.css',
    'node_modules/bootstrap/dist/css/bootstrap-theme.css'
  ],
  devCss: [
    'build/development/assets/**/*.css'
  ]
};

var src = {
  index: { files: 'index.pug', cwd: 'client' },
  templates: { files: [ '*/**/*.pug' ], cwd: 'client' },
  favicon: { files: 'client/favicon.ico' },
  styl: { files: '**/*.styl', cwd: 'client' },
  prodJs: { files: [].concat(files.js).concat(files.prodJs) }
};

var injections = {
  development: {
    js: [].concat(files.js).concat(files.devJs),
    css: [].concat(files.css).concat(files.devCss)
  },
  production: {
    js: [ 'dist/assets/**/*.js' ],
    css: [ 'dist/assets/**/*.css' ]
  }
};

// Cleanup Tasks
// -------------

gulp.task('clean:dist', function() {
  return gulp.src('dist/*', { read: false })
    .pipe(clean());
});

gulp.task('clean:dev', function() {
  return gulp.src('build/development/*', { read: false })
    .pipe(clean());
});

gulp.task('clean:tmp', function() {
  return gulp.src('tmp/*', { read: false })
    .pipe(clean());
});

gulp.task('clean', [ 'clean:dist', 'clean:dev', 'clean:tmp' ]);

// Development Tasks
// -----------------

gulp.task('dev:copy:favicon', function() {
  return task(src.favicon)
    .pipe(logFactory('build/development'))
    .add(pipeDevFiles)
    .end();
});

gulp.task('dev:copy', [ 'dev:copy:favicon' ]);

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

gulp.task('dev:pug:templates', function() {
  return task(src.templates)
    .pipe(logFactory('build/development', 'pug', 'html'))
    .add(pipeCompilePug)
    .add(pipeDevFiles)
    .end();
});

gulp.task('dev:pug:index', function() {
  return task(src.index)
    .pipe(logFactory('build/development', 'pug', 'html'))
    .add(pipeCompilePug)
    .add(pipeAutoInjectFactory('build/development'))
    .add(pipeDevFiles)
    .end();
});

gulp.task('dev:pug', [ 'dev:pug:templates', 'dev:pug:index' ]);

gulp.task('dev:stylus', function() {
  return task(src.styl)
    .pipe(logFactory('build/development/assets', 'styl', 'css'))
    .add(pipeCompileStylus)
    .add(pipeDevAssets)
    .end();
});

gulp.task('dev:compile', sequence('clean:dev', [ 'dev:copy', 'dev:pug:templates', 'dev:stylus' ], 'dev:pug:index'));

gulp.task('dev:watch:pug:templates', function() {
  return watchSrc(src.templates, function(file) {
    return watchTask(file, 'client')
      .pipe(logFactory('dev', 'pug', 'html'))
      .add(pipeCompilePug)
      .add(pipeDevFiles)
      .end();
  });
});

gulp.task('dev:watch:pug:index', function() {
  return watchSrc(src.index, function(file) {
    return watchTask(file, 'client')
      .pipe(logFactory('dev', 'pug', 'html'))
      .add(pipeCompilePug)
      .add(pipeAutoInjectFactory('dev'))
      .add(pipeDevFiles)
      .end();
  });
});

gulp.task('dev:watch:stylus', function() {
  return watchSrc(src.styl, function(file) {
    return watchTask(file, 'client')
      .pipe(logFactory('build/development/assets', 'styl', 'css'))
      .add(pipeCompileStylus)
      .add(pipeDevAssets)
      .end();
  });
});

gulp.task('dev:watch', [ 'dev:watch:pug:templates', 'dev:watch:pug:index', 'dev:watch:stylus' ]);

gulp.task('dev', sequence('clean:dev', 'dev:compile', [ 'dev:nodemon', 'dev:watch' ]));

// Production Tasks
// ----------------

gulp.task('env:prod', function() {
  env.set({
    NODE_ENV: 'production'
  });
});

gulp.task('dist:css', function() {
  return task(src.styl)
    .add(pipeCompileStylus)
    .pipe(addSrc.prepend(files.css))
    .pipe(concat('app.css'))
    .pipe(storeDistInitialSizeFactory('css'))
    .pipe(cssmin())
    .add(pipeProdAssets)
    .end();
});

gulp.task('dist:js', [ 'webpack' ], function() {
  return task(src.prodJs)
    .pipe(concat('app.js'))
    .pipe(storeDistInitialSizeFactory('js'))
    .pipe(uglify())
    .add(pipeProdAssets)
    .end();
});

gulp.task('dist:index', function() {
  return task(src.index)
    .add(pipeCompilePug)
    .add(pipeAutoInjectFactory('dist'))
    .pipe(storeDistInitialSizeFactory('html'))
    .pipe(removeHtmlComments())
    .add(pipeProdFiles)
    .end();
});

gulp.task('dist:favicon', function() {
  return task(src.favicon)
    .add(pipeProdFiles)
    .end();
});

gulp.task('dist:size', function(callback) {
  getFolderSize('dist', function(err, size) {
    if (err) {
      return callback(err);
    }

    util.log(util.colors.blue('dist - ' + prettyBytes(size)));
    callback();
  });
});

gulp.task('dist', sequence('env:prod', [ 'clean:dist', 'clean:tmp' ], [ 'dist:css', 'dist:favicon', 'dist:js' ], 'dist:index', 'dist:size'));

// Default Task
// ------------

gulp.task('default', [ 'dev' ]);

// Reusable piping functions
// -------------------------

function pipeAutoInjectFactory(dest) {
  return function(src) {

    var config = getConfig()

    function autoInject(files) {
      return inject(gulp.src(files, { read: false }), { ignorePath: dest });
    }

    return task(src)
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
    .pipe(gulp.dest('dist'))
    .pipe(logDistFactory());
}

function pipeProdAssets(src) {
  return src
    .pipe(rev())
    .pipe(gulp.dest('dist/assets'))
    .pipe(logDistFactory());
}

function pipeCompilePug(src) {
  return src
    .pipe(pug({}))
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

function logFactory(to, fromExt, toExt, from) {
  if (!from) {
    from = 'client';
  }

  return through.obj(function(file, enc, callback) {

    var relativePath = path.relative(from, file.path),
        fromPath = path.join(from, relativePath),
        toPath = path.join(to, relativePath);

    if (fromExt && toExt) {
      toPath = toPath.replace(new RegExp('\\.' + fromExt + '$'), '.' + toExt)
    }

    util.log(util.colors.cyan(fromPath) + ' -> ' + util.colors.cyan(toPath));

    callback(null, file);
  });
}

var sizes = {};

function storeDistInitialSizeFactory(name) {
  sizes[name] = 0;

  return through.obj(function(file, enc, callback) {
    sizes[name] += file.contents.length;
    callback(null, file);
  });
}

function logDistFactory(name) {
  return through.obj(function(file, enc, callback) {

    var relativePath = path.relative('dist', file.path),
        toPath = path.join('dist', relativePath);

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

function gulpifySrc(src) {
  return gulp.src(src.files, getSrcOptions(src));
}

function getSrcOptions(src) {
  return _.pick(src, 'base', 'cwd');
}

function task(src) {
  return new TaskBuilder(src);
}

function TaskBuilder(src) {
  if (typeof(src.pipe) == 'function') {
    this.src = src;
  } else if (src.files) {
    this.src = gulpifySrc(src);
  } else {
    this.src = gulp.src(src);
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

TaskBuilder.prototype.end = function() {
  return this.src;
};

function watchSrc(src, callback) {
  return watch(src.files, getSrcOptions(src), callback);
}

function watchTask(file, base) {
  return task({ files: file.path, base: base });
}
