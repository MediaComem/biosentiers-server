const _ = require('lodash');
const errors = require('./errors');

/**
 * Creates a middleware function that will fetch the record identified by the current URL and attach it to the request.
 * If no record is found, an HTTP 404 Not Found response will be sent.
 *
 * @param {Object} options
 * @param {String} [options.idParameter] - The URL parameter containing the resource identifier (defaults to `id`).
 * @param {Function} options.model - The model to use to fetch the resource.
 * @param {Function} [options.queryHandler] - An optional function to modify the database query
 *                                            (it will receive the query and the request as arguments,
 *                                            and should return the updated query).
 * @param {String} options.resourceName - The name of the API resource (used in error messages).
 * @param {String} [options.target] - The request property to attach the fetched record to (defaults to `options.resourceName`).
 * @returns Function A middleware function.
 */
module.exports = function(options) {
  if (!_.isObject(options)) {
    throw new Error('An options object is required');
  } else if (!_.isFunction(options.model)) {
    throw new Error('The "model" option must be a database model');
  } else if (_.has(options, 'queryHandler') && !_.isFunction(options.queryHandler)) {
    throw new Error('The "queryHandler" option must be a function');
  } else if (!_.isString(options.resourceName)) {
    throw new Error('The "resourceName" option must be a string (e.g. the name of the model)');
  } else if (_.has(options, 'target') && !_.isString(options.target)) {
    throw new Error('The "target" option must be a string');
  }

  options = _.defaults({}, options, {
    idParameter: 'id'
  });

  const Model = options.model;
  const queryHandler = options.queryHandler;
  const resourceName = options.resourceName;
  const target = options.target || resourceName;

  return function(req, res, next) {

    const apiId = req.params[options.idParameter];

    // Prepare the query to fetch the record
    let query = new Model({ api_id: apiId });

    // Pass the query through the handler (if any)
    if (_.isFunction(queryHandler)) {
      query = queryHandler(query, req);
    }

    // Perform the query
    query.fetch().then(function(record) {
      if (!record) {
        throw errors.recordNotFound(resourceName, apiId);
      }

      // Attach the record to the request object
      req[target] = record;
      next();
    }).catch(next);
  };
}
