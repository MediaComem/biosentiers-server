const _ = require('lodash');
const config = require('../../config');
const fs = require('fs');
const handlebars = require('handlebars');
const inflection = require('inflection');
const path = require('path');

module.exports = _.reduce([ 'welcome', 'passwordReset' ], (memo, name) => {
  const dir = config.path('server', 'mails', inflection.dasherize(inflection.underscore(name)));
  memo[name] = {
    txt: handlebars.compile(fs.readFileSync(path.join(dir, 'mail.txt'), { encoding: 'utf8' })),
    html: handlebars.compile(fs.readFileSync(path.join(dir, 'mail.html'), { encoding: 'utf8' }))
  };

  return memo;
}, {});
