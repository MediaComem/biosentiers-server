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

  virtuals: {
    href: {
      get: getHref
    }
  },

  outputVirtuals: false,

  generateApiId: function() {
    return uuid.v4();
  },

  parse: function(response) {

    let geomProperty;
    if (_.isString(this.geometry)) {
      geomProperty = this.geometry;
    } else if (this.geometry === true) {
      geomProperty = 'geom';
    } else if (this.geometry !== undefined) {
      throw new Error(`Model "geometry" property must be a string or boolean, got ${this.geometry} (${typeof(this.geometry)})`)
    }

    if (geomProperty && response[geomProperty]) {
      response[geomProperty] = JSON.parse(response[geomProperty]);
    }

    return response;
  },

  touch: function() {
    if (this.timestamps) {
      if (!this.has('created_at')) {
        this.set('created_at', new Date());
        this.set('updated_at', this.get('created_at'));
      } else {
        this.set('updated_at', new Date());
      }
    }
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
  transaction: function(callback) {
    return bookshelf.transaction(callback);
  }
});

function getHref() {

  const hrefBase = this.hrefBase;
  const hrefBuilder = this.hrefBuilder;
  if (!hrefBase && !hrefBuilder) {
    throw new Error('Virtual "href" property requires either "hrefBase" (string) or "hrefBuilder" (function) to be set');
  } else if (hrefBase && hrefBuilder) {
    throw new Error('Virtual "href" property requires either "hrefBase" (string) or "hrefBuilder" (function) to be set, not both');
  } else if (hrefBase && !_.isString(hrefBase)) {
    throw new Error('"hrefBase" must be a string');
  } else if (hrefBase && hrefBase.match(/\/$/)) {
    throw new Error('"hrefBase" must not end with a slash');
  } else if (hrefBuilder && !_.isFunction(hrefBuilder)) {
    throw new Error('"hrefBuilder" must be a function');
  }

  if (hrefBase) {
    const id = this.get('api_id');
    if (!id) {
      throw new Error('Virtual "href" property requires the model to have an "api_id" property');
    }

    return `${hrefBase}/${id}`;
  } else if (hrefBuilder) {
    return hrefBuilder.call(this, this);
  } else {
    throw new Error('Virtual "href" property could not be determined');
  }
}

module.exports = bookshelf.model('Abstract', Abstract);
