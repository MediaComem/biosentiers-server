var _ = require('lodash'),
    runSequence = require('run-sequence');

var srcUtils = require('./gulp-src-utils');

module.exports = {
  sequence: taskSequence,
  taskBuilder: taskBuilder,
  watchTaskBuilder: watchTaskBuilder
};

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
function taskSequence() {
  var tasks = Array.prototype.slice.call(arguments);
  return function(callback) {
    return runSequence.apply(undefined, [].concat(tasks).concat([ callback ]));
  };
}

/**
 * Returns a chainable gulp task builder.
 *
 * @param {*} src - The source files.
 * @param {Object} options - Additional options (may be omitted).
 * @returns {GulpTaskBuilder} A gulp task builder.
 * @see GulpTaskBuilder
 *
 * @example
 * return taskUtils.taskBuilder('*.stylus')
 *  .add(pipeCompileStylus)
 *  .pipe(concat('app.css'))
 *  .stream();
 */
function taskBuilder(src, options) {
  return new GulpTaskBuilder(src, options);
}

/**
 * Returns a task builder for a file watched with gulp-watch.
 *
 * @param {Object} file - The gulp file that changed.
 * @param {String} base - The base directory from which to determine the relative path of the file.
 * @returns {GulpTaskBuilder} A gulp task builder.
 *
 * @example
 * watch(glob, function(file) {
 *   return watchTaskBuilder(file, 'client')
 *     .pipe(livereload())
 *     .stream();
 * });
 */
function watchTaskBuilder(file, base) {
  return taskBuilder({ files: file.path, base: base });
}

/**
 * A wrapper around a gulp file stream to facilitate chained calls.
 *
 * @class
 * @classdesc Chainable gulp file stream wrapper.
 *
 * @example
 * function pipeCompileStylus(src) {
 *   return src.pipe(stylus());
 * }
 *
 * function pipeSaveBuild(src) {
 *   return src.pipe(gulp.dest('build'));
 * }
 *
 * // With a task builder, you can extract reusable pipe sequences into separate functions.
 * // Use {@link #stream} to retrieve the gulp file stream at the end of the chain.
 * new GulpTaskBuilder('*.styl')
 *   .add(pipeCompileStylus)
 *   .on('error', util.log)
 *   .pipe(concat('app.css'))
 *   .add(pipeSaveBuild)
 *   .stream();
 */
function GulpTaskBuilder(src, options) {
  this.src = srcUtils.gulpify(src, options);
}

GulpTaskBuilder.prototype.add = function(func) {
  this.src = func(this.src);
  return this;
};

GulpTaskBuilder.prototype.pipe = function(func) {
  this.src = this.src.pipe(func);
  return this;
};

GulpTaskBuilder.prototype.on = function() {
  var args = Array.prototype.slice.call(arguments);
  this.src = this.src.on.apply(this.src, args);
  return this;
};

GulpTaskBuilder.prototype.stream = function() {
  return this.src;
};
