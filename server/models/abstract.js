const _ = require('lodash');
const bookshelf = require('../db');
const BPromise = require('bluebird');
const db = require('../db');
const Collection = db.Collection;
const inflection = require('inflection');
const moment = require('moment');
const uuid = require('uuid');
const wellKnown = require('wellknown');

const DEFAULT_API_ID_COLUMN = 'api_id';
const MAX_UNIQUE_ID_GENERATION_ATTEMPTS = 25;

const proto = bookshelf.Model.prototype;

const protoProps = {};
enrichRelationsWithGeometry(protoProps, 'belongsTo', 'belongsToMany', 'hasMany', 'hasOne');

const Abstract = bookshelf.Model.extend(_.extend(protoProps, {
  constructor: function() {
    proto.constructor.apply(this, arguments);

    this.on('creating', this.initializeApiId, this);
    this.on('creating', this.initializeDefaults, this);
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

  initializeApiId: function() {
    const column = this.getApiIdColumn();
    if (this.apiId && !this.has(column)) {
      return this.generateUniqueApiId().then(apiId => this.set(column, apiId));
    }
  },

  generateApiId: function() {
    return this.constructor.generateApiId();
  },

  generateUniqueApiId: async function(attempt = 0) {
    if (attempt >= MAX_UNIQUE_ID_GENERATION_ATTEMPTS) {
      throw new Error(`Could not generate a unique API ID after ${attempt} attempts`);
    }

    const apiId = await BPromise.resolve(this.generateApiId());
    return new this.constructor()
      .query(qb => qb.clearSelect())
      .where(this.getApiIdColumn(), apiId)
      .fetch()
      .then(record => record ? this.generateUniqueApiId(attempt + 1) : apiId);
  },

  getApiIdColumn: function() {
    return this.constructor.getApiIdColumn();
  },

  parse: function(response) {
    const parsed = proto.parse.call(this, response);

    const geomProperty = getGeomProperty(this);
    if (geomProperty && parsed[geomProperty]) {
      parsed[geomProperty] = JSON.parse(parsed[geomProperty]);
    }

    return parsed;
  },

  parseFrom(source, ...properties) {
    const parsers = _.map(properties, createPropertiesParser);
    _.each(parsers, parser => parser(source, this));
    return this;
  },

  format: function(attributes) {
    const formatted = proto.format.call(this, attributes);

    const geomProperty = 'geom';
    if (geomProperty && formatted[geomProperty]) {
      formatted[geomProperty] = bookshelf.st.geomFromText(wellKnown.stringify(formatted[geomProperty]), 4326);
    }

    return attributes;
  },

  touch: function() {

    const hasCreatedAt = this.has('created_at');
    if (isTimestampEnabled(this, 'created_at') && !hasCreatedAt) {
      this.set('created_at', new Date());
    }

    const hasUpdatedAt = this.has('updated_at');
    if (isTimestampEnabled(this, 'updated_at')) {
      this.set('updated_at', hasCreatedAt && hasUpdatedAt ? new Date() : this.get('created_at') || new Date());
    }
  },

  updateDynamicProperties: function(attribute, properties) {
    return this.set(attribute, cleanUpProperties(_.extend({}, this.get(attribute), properties)));
  },

  mtiParentOf: mtiParentOf,

  initializeDefaults: function() {
    _.each(this.defaults || {}, (value, key) => {
      if (!this.has(key)) {
        this.set(key, value);
      }
    });
  }
}), {
  bulkCreate: async function(models, options) {
    if (!_.isArray(models)) {
      throw new Error('Models must be an array');
    } else if (!models.length) {
      return models;
    }

    // Initialize API IDs for all models
    await this.initializeApiIds(models);

    // Trigger "creating" and "saving" hooks
    await BPromise.all(models.map(model => model.triggerThen('creating saving', model, undefined, options)));

    // Bulk insert
    const idAttribute = this.prototype.idAttribute || 'id';
    const ids = await db.knex
      .insert(models.map(model => model.toJSON({ shallow: true })))
      .into(this.prototype.tableName)
      .returning(idAttribute);

    // Set the database IDs
    await models.map((model, i) => {
      model.set(idAttribute, ids[i]);
      // Trigger "created" and "saved" hooks
      return model.triggerThen('created saved', model, undefined, options);
    });

    return models;
  },

  initializeApiIds: async function(models) {
    if (!this.prototype.apiId) {
      return models;
    }

    const column = this.getApiIdColumn();
    const apiIds = await this.generateUniqueApiIds(models.length);
    models.forEach((model, i) => model.set(column, apiIds[i]));
    return models;
  },

  getApiIdColumn: function() {
    return this.prototype.apiIdColumn || DEFAULT_API_ID_COLUMN;
  },

  generateApiId: function() {
    const apiId = this.prototype.apiId;
    return _.isFunction(apiId) ? apiId.call(this) : uuid.v4();
  },

  generateUniqueApiIds: function(n, apiIds = [], attempt = 0) {
    if (n < 1) {
      throw new Error(`Number of IDs to generate must be greater than or equal to 1; got ${n}`);
    } else if (attempt >= MAX_UNIQUE_ID_GENERATION_ATTEMPTS) {
      throw new Error(`Could not generate ${n} unique API IDs after ${attempt} attempts`);
    }

    const column = this.getApiIdColumn();
    const missing = n - apiIds.length;

    const newApiIds = [];
    while (newApiIds.length < missing) {
      const newApiId = this.generateApiId();
      if (!_.includes(apiIds, newApiId) && !_.includes(newApiIds, newApiId)) {
        newApiIds.push(newApiId);
      }
    }

    return new this()
      .query(qb => qb.clearSelect())
      .where(column, 'IN', newApiIds)
      .fetchAll()
      .then(records => {
        _.difference(newApiIds, records.pluck(column)).forEach(apiId => apiIds.push(apiId));
        if (apiIds.length >= n) {
          return apiIds;
        } else {
          return this.generateUniqueApiIds(n, apiIds, attempt + 1);
        }
      });
  },

  transaction: function(callback) {
    return bookshelf.transaction(callback);
  }
});;

function createPropertiesParser(parser) {
  if (_.isFunction(parser)) {
    return parser;
  }

  let propertiesMap;
  if (_.isPlainObject(parser)) {
    propertiesMap = parser;
  } else if (_.isString(parser)) {
    propertiesMap = {
      [inflection.underscore(parser)]: parser
    };
  } else if (_.isArray(parser)) {
    propertiesMap = _.reduce(parser, function(memo, property) {
      memo[inflection.underscore(property)] = property;
      return memo;
    }, {});
  }

  if (!propertiesMap) {
    throw new Error('Parser must be a string, array, object or function');
  }

  return function(source, record) {
    _.each(propertiesMap, function(sourceProperty, recordProperty) {
      if (_.isFunction(sourceProperty)) {
        record.set(recordProperty, sourceProperty(source));
      } else if (_.has(source, sourceProperty)) {

        let value = source[sourceProperty];
        if (sourceProperty.match(/.At$/)) {
          value = moment(value).toDate();
        }

        record.set(recordProperty, value);
      }
    });
  };
}

function cleanUpProperties(properties) {
  if (_.isPlainObject(properties)) {
    return _.reduce(properties, (memo, value, key) => {
      if (value !== null && value !== undefined) {
        memo[key] = cleanUpProperties(value);
      }

      return memo;
    }, {});
  } else if (_.isArray(properties)) {
    return properties.filter(value => value !== null && value !== undefined).map(cleanUpProperties);
  } else {
    return properties;
  }
}

function isTimestampEnabled(record, timestamp) {
  const timestamps = record.timestamps;
  if (!timestamps) {
    return false;
  } else if (_.isArray(timestamps)) {
    return _.includes(timestamps, timestamp);
  } else if (_.isString(timestamps)) {
    return timestamps == timestamp;
  } else if (timestamps === true) {
    return true;
  } else {
    throw new Error(`"timestamps" property should be true, a string or an array, got ${JSON.stringify(timestamps)} (${typeof(timestamps)})`);
  }
}

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
    const apiIdColumn = this.getApiIdColumn();
    const apiId = this.get(apiIdColumn);
    if (!apiId) {
      throw new Error(`Virtual "href" property requires the model to have a "${apiIdColumn}" column`);
    }

    return `${hrefBase}/${apiId}`;
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
