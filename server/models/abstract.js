const _ = require('lodash');
const bookshelf = require('../db');
const BPromise = require('bluebird');
const db = require('../db');
const Collection = db.Collection;
const inflection = require('inflection');
const uuid = require('uuid');

const proto = bookshelf.Model.prototype;

const protoProps = {};
enrichRelationsWithGeometry(protoProps, 'belongsTo', 'belongsToMany', 'hasMany', 'hasOne');

const Abstract = bookshelf.Model.extend(_.extend(protoProps, {
  constructor: function() {
    proto.constructor.apply(this, arguments);

    this.on('creating', this._setApiId, this);
    this.on('creating', this._setDefaults, this);
    this.on('saving', this.touch, this);

    const geomProperty = getGeomProperty(this);
    if (geomProperty) {
      this.query(qb => qb.select(`${this.tableName}.*`, db.st.asGeoJSON(geomProperty)));
    }
  },

  virtuals: {
    href: {
      get: getHref
    }
  },

  outputVirtuals: false,

  generateApiId: function() {
    // TODO: generate unique API id
    return uuid.v4();
  },

  parse: function(response) {

    const geomProperty = getGeomProperty(this);
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

  mtiParentOf: mtiParentOf,

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
}), {
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

function mtiParentOf(target, mtiOptions, foreignKey, foreignKeyTarget, ...args) {
  const filterOptions = {};
  if (_.isString(mtiOptions)) {
    filterOptions.query = (qb, options) => {

      const discriminantModelsKey = inflection.pluralize(mtiOptions);
      const discriminantModels = options[discriminantModelsKey];
      if (!discriminantModels) {
        throw new Error(`Expected load options to have a "${discriminantModelsKey}" property containing the ${mtiOptions} models used to discriminate the MTI relationship`);
      } else if (!(discriminantModels instanceof Collection)) {
        throw new Error(`Load options "${discriminantModelsKey}" must be a bookshelf collection of models`);
      }

      const discriminantModel = discriminantModels.find(model => {
        return model.get('name') == inflection.underscore(target);
      });

      if (!discriminantModel) {
        throw new Error(`Could not find ${mtiOptions} matching relation ${target}`);
      }

      const records = options.parentResponse;

      const discriminantColumn = `${inflection.underscore(mtiOptions)}_id`;
      const predicate = record => record[discriminantColumn] == discriminantModel.get('id');

      const filterForeignKey = foreignKey || 'id';
      const filterForeignKeyTable = db.model(target).prototype.tableName;
      const filterForeignKeyTarget = foreignKeyTarget || `${filterForeignKeyTable}.id`;

      qb.clearWhere().whereIn(filterForeignKeyTarget, _(records).filter(predicate).map(filterForeignKey).value())
    };
  } else if (_.isFunction(mtiOptions)) {
    filterOptions.query = mtiOptions;
  } else if (_.isPlainObject(mtiOptions)) {
    _.extend(filterOptions, mtiOptions.filter);
  } else {
    throw new Error(`Multiple table inheritance options must be a string, function or object, got ${JSON.stringify(mtiOptions)} (${typeof(mtiOptions)})`);
  }

  return filteredRelation(this.belongsTo(target, foreignKey, foreignKeyTarget, ...args), filterOptions);
}

function filteredRelation(bookshelfRelation, options) {
  const query = _.get(options, 'query', _.noop);

  const originalSelectConstraints = bookshelfRelation.relatedData.selectConstraints;
  bookshelfRelation.relatedData.selectConstraints = function(qb, options) {
    const result = originalSelectConstraints.apply(this, arguments);
    query(qb, options);
    return result;
  };

  return bookshelfRelation;
}

function getGeomProperty(record) {
  if (_.isString(record.geometry)) {
    return record.geometry;
  } else if (record.geometry === true) {
    return 'geom';
  } else if (record.geometry !== undefined) {
    throw new Error(`Model "geometry" property must be a string or boolean, got ${JSON.stringify(record.geometry)} (${typeof(record.geometry)})`)
  }
}

function enrichRelationWithGeometry(record, relationType, target, ...args) {
  let relation = proto[relationType].call(record, target, ...args);

  const targetProto = db.model(target).prototype;
  const geomProperty = getGeomProperty(targetProto);
  if (geomProperty) {
    relation = relation.query(qb => qb.select(`${targetProto.tableName}.*`, db.st.asGeoJSON(geomProperty)));
  }

  return relation;
}

function enrichRelationsWithGeometry(protoProps, ...relations) {
  relations.forEach(relation => {
    const originalRelationMethod = proto[relation];
    protoProps[relation] = function(target, ...args) {
      return enrichRelationWithGeometry(this, relation, target, ...args);
    };
  });
}

module.exports = bookshelf.model('Abstract', Abstract);
