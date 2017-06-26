const _ = require('lodash');
const bookshelf = require('../db');
const BPromise = require('bluebird');
const inflection = require('inflection');
const uuid = require('uuid');

const proto = bookshelf.Model.prototype;

const Abstract = bookshelf.Model.extend({
  constructor: function() {
    proto.constructor.apply(this, arguments);
    this.on('creating', this._setApiId, this);
    this.on('creating', this._setDefaults, this);
    this.on('saving', this.touch, this);
  },

  touch: function() {
    if (this.timestamps) {
      if (!this.has('created_at')) {
        this.set('created_at', new Date());
      }

      this.set('updated_at', new Date());
    }
  },

  generateApiId: function() {
    return uuid.v4();
  },

  _setApiId: function() {
    if (this.apiId && !this.has('api_id')) {
      return BPromise.resolve().then(this.generateApiId.bind(this)).then(apiId => {
        this.set('api_id', apiId);
      });
    }
  },

  _setDefaults: function() {

    const has = _.bind(this.has, this);
    const set = _.bind(this.set, this);

    _.each(this.defaults || {}, function(value, key) {
      if (!has(key)) {
        set(key, value);
      }
    });
  }
}, {
  parseGeoJson: function(geoJson) {
    try {
      return JSON.parse(geoJson);
    } catch(err) {
      // ignore
    }
  },

  parseJson: function(req, record) {
    if (!record) {
      record = new this();
    }

    let attrs = _.toArray(arguments).slice(2);
    if (!attrs.length) {
      attrs = resolveParsingAttributes(record);
    }

    const underscored = _.reduce(req.body, function(memo, value, key) {
      memo[inflection.underscore(key)] = value;
      return memo;
    }, {});

    record.set(_.pick(underscored, attrs));

    return record;
  },

  transaction: function(callback) {
    return bookshelf.transaction(callback);
  }
});

module.exports = bookshelf.model('Abstract', Abstract);

function resolveParsingAttributes(record) {

  let attrs;
  const config = record.parsing;

  if (_.isObject(config)) {
    attrs = config[record.isNew() ? 'create' : 'update'] || config.default;
  } else if (_.isString(config) || _.isArray(config)) {
    attrs = config;
  } else {
    throw new Error('Unsupported parsing configuration type ' + typeof(config) + '; must be an object, string or array');
  }

  if (_.isString(attrs)) {
    attrs = attrs.split(/\s+/);
  } else if (!_.isArray(attrs)) {
    throw new Error('Unsupported parsing configuration attributes type ' + typeof(attrs) + '; must be a string or array');
  }

  return attrs;
}
