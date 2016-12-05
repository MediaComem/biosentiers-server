var _ = require('lodash'),
    bookshelf = require('../db'),
    uuid = require('uuid');

var proto = bookshelf.Model.prototype;

var Abstract = bookshelf.Model.extend({
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

  _setApiId: function() {
    if (this.apiId && !this.has('api_id')) {
      this.set('api_id', uuid.v4());
    }
  },

  _setDefaults: function() {

    var has = _.bind(this.has, this),
        set = _.bind(this.set, this);

    _.each(this.defaults || {}, function(value, key) {
      if (!has(key)) {
        set(key, value);
      }
    });
  }
}, {
  parse: function(req, record) {
    if (!record) {
      record = new this();
    }

    var attrs = _.toArray(arguments).slice(2);
    if (!attrs.length) {
      attrs = resolveParsingAttributes(record);
    }

    record.set(_.pick(req.body, attrs));

    return record;
  },

  transaction: function(callback) {
    return bookshelf.transaction(callback);
  }
});

module.exports = bookshelf.model('Abstract', Abstract);

function resolveParsingAttributes(record) {

  var attrs,
      config = record.parsing;

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
