var _ = require('lodash'),
    path = require('path'),
    prettyBytes = require('pretty-bytes'),
    sha1 = require('node-sha1'),
    through = require('through2'),
    util = require('gulp-util');

var concatCounts = {},
    fileTypeSizes = {},
    revFingerprints = {},
    root = path.normalize(path.join(__dirname, '..'));

module.exports = {
  processedFiles: logProcessedFiles,
  storeInitialSize: storeInitialSize,
  concatenatingFiles: logConcatenatingFiles,
  concatenatedFiles: logConcatenatedFiles,
  userefFiles: logUserefFiles,
  minifiedFiles: logMinifiedFiles,
  revedFiles: logRevedFiles,
  revReplacedFiles: logRevReplacedFiles
};

function logProcessedFiles(to, fromExt, logSize) {
  return passthroughFile(function(file) {

    var base = file.base,
        relativeBase = path.relative(root, base),
        relativePath = path.relative(base, file.path),
        fromPath = path.join(relativeBase, relativePath),
        toPath = path.join(to, relativePath);

    if (fromExt) {
      fromPath = fromPath.replace(/\.[^\.]+$/, '.' + fromExt);
    }

    var message = util.colors.yellow(fromPath) + ' -> ' + util.colors.magenta(toPath);

    if (logSize) {
      message += ' (' + util.colors.dim(prettyBytes(file.contents.length)) + ')';
    }

    util.log(message);
  });
}

function storeInitialSize(type) {
  fileTypeSizes[type] = 0;

  return passthroughFile(function(file) {
    fileTypeSizes[type] += file.contents.length;
  });
}

function logConcatenatingFiles(name) {
  return passthroughFile(function(file) {
    var relativePath = path.relative(root, file.path);
    util.log('Concat ' + util.colors.bold(name) + ' file ' + util.colors.yellow(relativePath));
    concatCounts[name] = (concatCounts[name] || 0) + 1;
  });
}

function logConcatenatedFiles(name) {
  return passthroughFile(function(file) {

    var size = file.contents.length,
        relativePath = path.relative(root, file.path);

    util.log(concatCounts[name] + ' ' + util.colors.bold(name) + ' files -> ' + util.colors.magenta(relativePath) + ' (' + util.colors.dim(prettyBytes(size)) + ')');
  });
}

function logUserefFiles() {
  return passthroughFile(function(file) {

    var size = prettyBytes(file.contents.length),
        relativePath = path.relative(root, file.path);

    util.log('Useref ' + util.colors.magenta(relativePath) + ' (' + util.colors.dim(size) + ')');
  });
}

function logMinifiedFiles() {
  return passthroughFile(function(file) {

    var size = prettyBytes(file.contents.length),
        relativePath = path.relative(root, file.path);

    var type = file.path.replace(/.*\./, ''),
        initialSize = fileTypeSizes[type];

    if (initialSize) {
      size = prettyBytes(initialSize) + ' -> ' + size;
    }

    util.log('Minified ' + util.colors.magenta(relativePath) + ' (' + util.colors.dim(size) + ')');
  });
}

function logRevedFiles() {
  return passthroughFile(function(file) {
    if (file.revOrigPath) {

      var relativePath = path.relative(root, file.path),
          relativeOrigPath = path.relative(root, file.revOrigPath);

      util.log('Rev ' + util.colors.yellow(relativeOrigPath) + ' -> ' + util.colors.magenta(relativePath));
    }
  });
}

function logRevReplacedFiles() {
  return passthroughFile(function(file) {

    var oldFingerprint = revFingerprints[file.path];
    if (!oldFingerprint) {
      return;
    }

    var relativePath = path.relative(root, file.path),
        newFingerprint = sha1(file.contents.toString());

    if (newFingerprint != oldFingerprint) {
      util.log('Replaced references to rev\'d assets in ' + util.colors.magenta(relativePath));
    }
  });
}

logRevReplacedFiles.fingerprint = function() {
  return passthroughFile(function(file) {
    revFingerprints[file.path] = sha1(file.contents.toString());
  });
};

function passthroughFile(func) {
  return through.obj(function(file, enc, callback) {
    if (file.contents) {
      func(file, enc);
    }

    callback(null, file);
  });
}
