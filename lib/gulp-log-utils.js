var _ = require('lodash'),
    path = require('path'),
    prettyBytes = require('pretty-bytes'),
    through = require('through2'),
    util = require('gulp-util');

var fileTypeSizes = {},
    root = path.normalize(path.join(__dirname, '..'));

module.exports = {
  processedFiles: processedFiles,
  productionFiles: productionFiles,
  storeInitialSize: storeInitialSize,
};

/**
 * Gulp plugin that logs the source and target paths of files as they are processed through gulp.
 * It should be added in a gulp chain after the files have been processed but before they are saved.
 *
 * @param {String} to - The destination directory.
 * @param {String} fromExt - The original extension (e.g. `.pug`). Omit this parameter if the extension does not change.
 * @param {String} toExt - The new extension (e.g. `.html`). Omit this parameter if the extension does not change.
 * @returns {Function} A gulp plugin.
 *
 * @example
 * return gulp
 *   .src('*.pug')
 *   .pipe(pug())
 *   .pipe(logUtils.processedFiles('build'))
 *   .pipe(gulp.dest('build'));
 */
function processedFiles(to, fromExt, toExt) {
  return through.obj(function(file, enc, callback) {

    var base = file.base,
        relativeBase = path.relative(root, base),
        relativePath = path.relative(base, file.path),
        fromPath = path.join(relativeBase, relativePath),
        toPath = path.join(to, relativePath);

    if (fromExt && toExt) {
      toPath = toPath.replace(new RegExp('\\.' + fromExt + '$'), '.' + toExt);
    }

    util.log(util.colors.cyan(fromPath) + ' -> ' + util.colors.cyan(toPath));

    callback(null, file);
  });
}

/**
 * Gulp plugin that stores the total size of files of a given type as they are processed through gulp.
 * The goal is, for example, to know the total uncompressed size of all CSS files before concatenating and minifying them.
 *
 * @param {String} name - The type of file (e.g. `js`).
 * @returns {Function} A gulp plugin.
 *
 * @example
 * return gulp.src('*.styl')
 *   .pipe(stylus())
 *   .pipe(concat('app.css'))
 *   .pipe(logUtils.storeInitialSize('css'))
 *   .pipe(cssmin())
 *   .pipe(gulp.dest('build'));
 */
function storeInitialSize(type) {
  fileTypeSizes[type] = 0;

  return through.obj(function(file, enc, callback) {
    fileTypeSizes[type] += file.contents.length;
    callback(null, file);
  });
}

/**
 * Gulp plugin that logs the size of files processed through gulp.
 * The goal is to log the final size of production assets.
 *
 * If the initial size of the corresponding file type was previously
 * stored with `storeInitialSize`, it will also be logged.
 *
 * @param {String} to - The destination directory.
 * @returns {Function} A gulp plugin.
 *
 * @example
 * return gulp.src('*.js')
 *   .pipe(concat('app.js'))
 *   .pipe(uglify())
 *   .pipe(logUtils.productionFiles('build'))
 *   .pipe(gulp.dest('build'));
 */
function productionFiles(to) {
  return through.obj(function(file, enc, callback) {
    if (!file.contents) {
      return callback(null, file);
    }

    var relativePath = path.relative(to, file.path),
        relativeToPath = path.join(to, relativePath),
        size = prettyBytes(file.contents.length);

    var type = file.path.replace(/.*\./, ''),
        initialSize = fileTypeSizes[type];

    if (initialSize) {
      size = prettyBytes(initialSize) + ' -> ' + size;
    }

    util.log(util.colors.blue(relativeToPath + ' - ' + size));

    callback(null, file);
  });
}
