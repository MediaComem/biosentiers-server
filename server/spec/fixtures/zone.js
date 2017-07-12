const _ = require('lodash');
const chance = require('../chance');
const db = require('../../db');
const spec = require('../utils');
const wellKnown = require('wellknown');
const Zone = require('../../models/zone');

exports.zone = function(data) {
  data = data || {};

  const position = data.position;
  const trailId = data.trailId || _.get(data.trail, 'get', _.constant()).call(data.trail, 'id');

  return spec.createRecord(Zone, {
    type: chance.sentence({ words: 2 }),
    description: chance.paragraph(),
    nature_type: chance.sentence(),
    geom: db.st.geomFromText(wellKnown.stringify(chance.polygon()), 4326),
    created_at: data.createdAt || _.get(data.trail, 'get', _.constant()).call(data.trail, 'created_at')
  }).then(zone => {
    if (trailId || position) {
      return zone.trails().attach({ trail_id: trailId, position: position }).then(() => zone);
    } else {
      return zone;
    }
  });
};
