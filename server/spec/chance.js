const chance = require('chance').Chance();

module.exports = chance;

chance.polygon = function() {

  const start = [ chance.longitude({ min: -50, max: 50 }), chance.latitude({ min: -50, max: 50 }) ];

  return {
    type: 'Polygon',
    coordinates: [
      [
        start,
        [ start[0] + 0.5, start[1] ],
        [ start[0] + 0.5, start[1] + 0.5 ],
        [ start[0], start[1] + 0.5 ],
        start
      ]
    ]
  };
};
