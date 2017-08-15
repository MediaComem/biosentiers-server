const _ = require('lodash');
const BPromise = require('bluebird');
const httpStatuses = require('http-status');

module.exports = function(func) {
  return function(...args) {
    return handleResponseAssertionError(res => {
      return func(res, ...args);
    });
  };
};

function handleResponseAssertionError(func) {
  return function(res) {
    try {
      const result = func(res);
      return BPromise.resolve(result).catch(function(err) {
        return BPromise.reject(enrichResponseAssertionError(err, res));
      }).return(res);
    } catch(err) {
      throw enrichResponseAssertionError(err, res);
    }
  };
}

function enrichResponseAssertionError(err, res) {
  if (err.name != 'AssertionError' || err.stack.match(/^\s*HTTP\/1\.1/)) {
    return err;
  }

  let resDesc = 'HTTP/1.1 ' + res.status;

  const code = httpStatuses[res.status];
  if (code) {
    resDesc = resDesc + ' ' + code;
  }

  _.each(res.headers, function(value, key) {
    resDesc = resDesc + '\n' + key + ': ' + value;
  });

  if (res.body) {
    resDesc = resDesc + '\n\n';

    const contentType = res.get('Content-Type');
    if (contentType.match(/^application\/json/)) {
      resDesc = resDesc + JSON.stringify(res.body, null, 2);
    } else {
      resDesc = resDesc + res.body.toString();
    }
  }

  let rest;
  let message = 'AssertionError: ' + err.message;

  if (err.stack.indexOf(message) === 0) {
    rest = err.stack.slice(message.length + 1);
  } else {
    const firstEol = err.stack.indexOf('\n');
    message = err.stack.slice(0, firstEol);
    rest = err.stack.slice(firstEol);
  }

  let indent = '';

  const indentMatch = rest.match(/^\s+/);
  if (indentMatch) {
    indent = Array(indentMatch[0].length + 1).join(' ');
  }

  err.stack = message + '\n' + resDesc.replace(/^/gm, indent) + '\n\n' + rest;

  return err;
}
