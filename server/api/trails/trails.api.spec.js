const _ = require('lodash');
const expectTrail = require('../../spec/expectations/trail');
const geoJsonLength = require('geojson-length');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const trailFixtures = require('../../spec/fixtures/trail');
const userFixtures = require('../../spec/fixtures/user');

spec.setUpMocha();

describe('Trails API', function() {

  let data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/trails', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.admin = userFixtures.admin();

        data.reqBody = {
          name: 'Over the rainbow',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [ 6.65157, 46.78073, 430.60218 ],
                [ 6.65163, 46.78070, 432.68234 ]
              ],
              [
                [ 6.65157, 46.78073, 430.60218 ],
                [ 6.65162, 46.78083, 430.07232 ],
                [ 6.65177, 46.78114, 430.02803 ]
              ]
            ]
          }
        };
      });
    });

    it('should create a trail', function() {

      const expected = _.extend({
        length: Math.round(geoJsonLength(data.reqBody.geometry)),
        createdJustAfter: data.afterSetup,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/trails?include=geometry', data.reqBody)
        .set('Authorization', 'Bearer ' + data.admin.generateJwt())
        .then(expectTrail.inBody(expected));
    });
  });
});
