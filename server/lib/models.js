const _ = require('lodash');
const BPromise = require('bluebird');

exports.setRelated = function(model, relation, related) {
  model.relations[relation] = related;
  return model;
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
