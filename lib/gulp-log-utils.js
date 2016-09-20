var _ = require('lodash'),
    getFolderSize = require('get-folder-size'),
    path = require('path'),
    prettyBytes = require('pretty-bytes'),
    sha1 = require('node-sha1'),
    through = require('through2'),
    util = require('gulp-util');

var concatCounts = {},
    fileTypeSizes = {},
    revFingerprints = {},
    root = path.normalize(path.join(__dirname, '..'));

exports.directorySize = function() {
  return through.obj(function(file, enc, callback) {
    getFolderSize(file.path, function(err, size) {
      if (err) {
        return callback(err);
      }

      util.log('Size of ' + printFile('build/production') + ' ' + printSize(size));

      callback(null, file);
    });
  });
};

exports.processedFiles = function(to, fromExt, logSize) {
  return passthroughFile(function(file) {

    var base = file.base,
        relativeBase = path.relative(root, base),
        relativePath = path.relative(base, file.path),
        fromPath = path.join(relativeBase, relativePath),
        toPath = path.join(to, relativePath);

    if (fromExt) {
      fromPath = fromPath.replace(/\.[^\.]+$/, '.' + fromExt);
    }

    var message = printSourceFile(fromPath) + ' -> ' + printFile(toPath);

    if (logSize) {
      message += ' ' + printSize(file.contents.length);
    }

    util.log(message);
  });
};

exports.storeInitialSize = function(type) {
  fileTypeSizes[type] = 0;
  return passthroughFile(function(file) {
    fileTypeSizes[type] += file.contents.length;
  });
};

exports.concatenatingFiles = function(name) {
  return passthroughFile(function(file) {

    var relativePath = path.relative(root, file.path);

    util.log('Concat ' + printRef(name) + ' file ' + printSourceFile(relativePath));

    concatCounts[name] = (concatCounts[name] || 0) + 1;
  });
};

exports.concatenatedFiles = function(name) {
  return passthroughFile(function(file) {

    var count = concatCounts[name],
        size = file.contents.length,
        relativePath = path.relative(root, file.path);

    util.log(count + ' ' + printRef(name) + ' files -> ' + printFile(relativePath) + ' ' + printSize(size));
  });
};

exports.userefFiles = function() {
  return passthroughFile(function(file) {

    var size = file.contents.length,
        relativePath = path.relative(root, file.path);

    util.log('Useref ' + printFile(relativePath) + ' ' + printSize(size));
  });
};

exports.minifiedFiles = function() {
  return passthroughFile(function(file) {

    var type = file.path.replace(/.*\./, ''),
        initialSize = fileTypeSizes[type],
        size = prettyBytes(file.contents.length),
        relativePath = path.relative(root, file.path);

    if (initialSize) {
      size = prettyBytes(initialSize) + ' -> ' + size;
    }

    util.log('Minified ' + printFile(relativePath) + ' ' + printSize(size));
  });
};

exports.revedFiles = function() {
  return passthroughFile(function(file) {
    if (file.revOrigPath) {

      var relativePath = path.relative(root, file.path),
          relativeOrigPath = path.relative(root, file.revOrigPath);

      util.log('Rev ' + printSourceFile(relativeOrigPath) + ' -> ' + printFile(relativePath));
    }
  });
};

exports.revReplacedFiles = function() {
  return passthroughFile(function(file) {

    var oldFingerprint = revFingerprints[file.path];
    if (!oldFingerprint) {
      return;
    }

    var relativePath = path.relative(root, file.path),
        newFingerprint = sha1(file.contents.toString());

    if (newFingerprint != oldFingerprint) {
      util.log('Replaced references to rev\'d assets in ' + printFile(relativePath));
    }
  });
};

exports.revReplacedFiles.fingerprint = function() {
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

function printFile(path) {
  return util.colors.magenta(path);
}

function printSourceFile(path) {
  return util.colors.yellow(path);
}

function printSize(size) {
  return util.colors.dim(_.isNumber(size) ? prettyBytes(size) : size);
}

function printRef(ref) {
  return util.colors.bold(ref);
}
