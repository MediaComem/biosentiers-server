var _ = require('lodash'),
    chain = require('gulp-chain'),
    gulp = require('gulp'),
    path = require('path'),
    sort = require('gulp-sort'),
    stable = require('stable'),
    watch = require('gulp-watch');

module.exports = {
  gulpify: gulpifySrc,
  stableSort: stableSort,
  watch: watchSrc
};

/**
 * Watches the specified files with gulp-watch and calls the specified callback when a change is detected.
 *
 * @param {String,Array,Object} src - The files to watch.
 *                                    This can be a String file glob or an Array thereof.
 *                                    It can also be an Object which should have a `files` property with a file glob or globs.
 *                                    In that case, the remaining properties of the object are passed to gulp-watch as options.
 * @param {Function} callback - The callback function to be notified of changes.
 *                              See https://www.npmjs.com/package/gulp-watch
 */
function watchSrc(src, callback) {
  var globs = _.has(src, 'files') ? src.files : src;
  return watch(globs, getSrcOptions(src), callback);
}

/**
 * Builds a function that will pipe a custom sort function into a gulp file stream.
 *
 * @param {Function} compare - A file comparison function which will receive two gulp files as arguments.
 *                             It must return -1, 0 or 1 to determine whether the first file should be placed
 *                             before, at the same position or after the second file.
 * @returns {Function} A gulp plugin.
 *
 * @example
 * gulp.src('*.css')
 *   .pipe(stableSort(sortStylesheets))
 *   .pipe(gulp.dest('build'));
 */
function stableSort(compare) {
  return chain(function(stream) {
    return stream.pipe(sort({
      customSortFn: function(files) {
        return stable(files, compare);
      }
    }));
  })();
}

/**
 * Transforms multiple source file definition formats into a gulp source.
 *
 * @param {String,Array,Object,Function} src - The files to transform into a gulp source (see examples).
 * @param {Object} options - Additional gulp options.
 *                           If `src` is a function, the options are provided as an argument.
 *                           If `src` is a String or Array, the options are provided to `gulp.src` as the second argument.
 *                           If `src` is an object, the options are merged with it and provided to `gulp.src` as the second argument.
 * @param {Function} options.compare - An optional comparison function.
 *                                     If given, it will be piped into the stream to sort the source files.
 * @returns {Stream} A gulp file stream.
 *
 * @example
 * gulpifySrc('foo.txt', { base: 'client' })                // gulp.src('foo.txt', { base: 'client' })
 * gulpifySrc([ 'foo.txt', 'bar.txt' ], { read: false })    // gulp.src([ 'foo.txt', 'bar.txt' ], { read: false })
 * gulpifySrc({ files: 'foo.txt', cwd: 'client' })          // gulp.src('foo.txt', { cwd: 'client' })
 * gulpifySrc(gulp.src('foo.txt'))                          // gulp.src('foo.txt')
 * gulpifySrc(customSourceFunc, { foo: 'bar' })             // customSourceFunc({ foo: 'bar' })
 */
function gulpifySrc(src, options) {
  if (_.isFunction(src)) {
    return gulpifySrc(src(options), options);
  }

  var gulpSrc,
      gulpOptions = _.extend({}, options);

  if (_.isFunction(src.pipe)) {
    // Source is already a file stream.
    gulpSrc = src;
  } else {

    var files;
    if (_.isString(src) || _.isArray(src)) {
      // Source is a file glob or an array thereof.
      files = src;
    } else if (_.isObject(src) && _.has(src, 'files')) {
      // Source is an object with a `files` property that is a file glob or an array thereof.
      files = _.isFunction(src.files) ? src.files() : src.files;
      // The remaining properties of the object are additional options to give to `gulp.src`.
      _.defaults(gulpOptions, src);
    } else {
      // Source is not supported.
      throw new Error('Source of type ' + typeof(src) + ' cannot be gulpified');
    }

    var srcOptions = getSrcOptions(gulpOptions);

    // Ensure `cwd` is an absolute path if present.
    if (srcOptions.cwd) {
      srcOptions.cwd = path.resolve(srcOptions.cwd);
    }

    // Transform the file glob(s) into a gulp source.
    gulpSrc = gulp.src(files, srcOptions);
  }

  // Get comparison function from options (if any).
  var compare = gulpOptions.compare;
  delete gulpOptions.compare;

  // Apply the comparison function (if any).
  if (_.isFunction(compare)) {
    gulpSrc = gulpSrc.pipe(stableSort(compare));
  }

  return gulpSrc;
}

function getSrcOptions(src) {
  return _.isObject(src) ? _.omit(src, 'compare', 'files') : {};
}
