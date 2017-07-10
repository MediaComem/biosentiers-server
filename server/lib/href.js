const _ = require('lodash');

exports.hrefToApiId = function(href) {
  if (!_.isString(href)) {
    throw new Error(`Hyperlink reference must be a string, got ${JSON.stringify(href)} (${typeof(href)})`)
  }

  return href.replace(/^.*\//, '');
};
