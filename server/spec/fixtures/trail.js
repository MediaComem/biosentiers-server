const _ = require('lodash');
const generator = require('../generator');
const geoJsonLength = require('geojson-length');
const spec = require('../utils');
const Trail = require('../../models/trail');

exports.trail = function(data) {
  data = data || {};

  const geometry = exports.geometry();

  return spec.createRecord(Trail, {
    name: data.name || exports.name(),
    geom: geometry,
    path_length: Math.round(geoJsonLength(geometry)),
    created_at: data.createdAt,
    updated_at: data.updatedAt
  });
};

exports.name = generator.incremental(function(i) {
  return 'Trail ' + i;
});

exports.geometry = function(i) {
  return {
    type: 'MultiLineString',
    coordinates: [
      [
        [ 6.65157363689778, 46.7807302849676, 430.602185000405 ],
        [ 6.65163368313673, 46.7807049372065, 432.682344000041 ]
      ],
      [
        [ 6.65157363689778, 46.7807302849676, 430.602185000405 ],
        [ 6.65162789684919, 46.7808352736337, 430.072329999879 ],
        [ 6.6517792810376, 46.7811447875451, 430.028033000082 ]
      ]
    ]
  };
};
