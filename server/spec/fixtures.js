var _ = require('lodash'),
    Promise = require('bluebird');

var fixtures = {},
    fixtureDefinitions = {},
    generators = {},
    generatorCounters = {};

exports.create = function(name, definitionName, fixtureData) {

  if (_.isObject(definitionName) || definitionName === undefined) {
    fixtureData = definitionName;
    definitionName = name;
  }

  var definition = fixtureDefinitions[definitionName];
  if (!definition) {
    throw new Error('No ' + definitionName + ' fixture has been defined');
  }

  return definition(_.extend({}, fixtureData)).then(function(created) {
    fixtures[name] = created;
    return created;
  });
};

exports.get = function(name) {
  if (!fixtures[name]) {
    throw new Error('No fixture named ' + name + ' has been created yet');
  }

  return fixtures[name];
};

exports.generate = function(name) {
  if (!generators[name]) {
    throw new Error('No generator named ' + name + ' has been defined');
  }

  return generators[name].apply(undefined, Array.prototype.slice.call(arguments, 1));
};

exports.define = function(name, fixture) {
  fixtureDefinitions[name] = function(data) {
    return Promise.resolve(data).then(resolveData).then(function(resolvedData) {
      return fixture(resolvedData);
    });
  };
};

exports.defineGenerator = function(name, generator) {
  generatorCounters[name] = 0;
  generators[name] = function() {

    var args = _.toArray(arguments);
    args.unshift(generatorCounters[name]++);

    return generator.apply(undefined, args);
  };
};

function resolveData(data) {
  return Promise.resolve(data);
}
