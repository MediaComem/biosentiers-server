const _ = require('lodash');
const chance = require('../chance');
const db = require('../../db');
const spec = require('../utils');
const wellKnown = require('wellknown');
const Zone = require('../../models/zone');

exports.zone = function(data) {
  data = data || {};
  return spec.createRecord(Zone, {
    keyword: chance.sentence({ words: 2 }),
    description: chance.paragraph(),
    keyword_nature: chance.sentence(),
    position: data.position,
    geom: db.st.geomFromText(wellKnown.stringify(chance.polygon()), 4326),
    trail_id: data.trailId || _.get(data.trail, 'get', _.constant()).call(data.trail, 'id'),
    created_at: data.createdAt || _.get(data.trail, 'get', _.constant()).call(data.trail, 'created_at')
  });
};
