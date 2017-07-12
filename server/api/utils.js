const _ = require('lodash');
const BPromise = require('bluebird');

// TODO: rename this file to query/params
exports.includes = function(req, related) {

  let includes = req.query.include;
  if (!includes) {
    return false;
  }

  if (!_.isArray(includes)) {
    includes = [ includes ];
  }

  return _.includes(includes, related);
};

exports.multiValueParam = function(value, filter, converter) {
  if (value === undefined) {
    return [];
  }

  converter = converter || _.identity;
  filter = filter || _.constant(true);
  value = _.isArray(value) ? value : [ value ];

  return _.uniq(_.map(_.filter(value, filter), converter)).sort();
};

exports.updateManyToMany = function(model, relation, records) {
  if (!records) {
    return;
  }

  const collection = model[relation]();
  const currentRecords = model.related(relation).models;

  let promise = BPromise.resolve();

  const newRecords = _.reject(records, (r) => _.find(currentRecords, (cr) => cr.get('id') === r.get('id')));
  if (newRecords.length) {
    promise = promise.then(() => collection.attach(newRecords));
    _.each(newRecords, (r) => model.related(relation).add(r));
  }

  const oldRecords = _.reject(currentRecords, (cr) => _.find(records, (r) => r.get('id') === cr.get('id')));
  if (oldRecords.length) {
    promise = promise.then(() => collection.detach(oldRecords));
    _.each(oldRecords, (r) => model.related(relation).remove(r))
  }

  return promise;
};
