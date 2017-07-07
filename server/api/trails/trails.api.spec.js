const _ = require('lodash');
const expectRes = require('../../spec/expectations/response');
const expectTrail = require('../../spec/expectations/trail');
const geoJsonLength = require('geojson-length');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const trailFixtures = require('../../spec/fixtures/trail');
const userFixtures = require('../../spec/fixtures/user');

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
                [ 6.65157363689778, 46.7807302849676, 430.602185000405 ],
                [ 6.65163368313673, 46.7807049372065, 432.682344000041 ]
              ],
              [
                [ 6.65157363689778, 46.7807302849676, 430.602185000405 ],
                [ 6.65162789684919, 46.7808352736337, 430.072329999879 ],
                [ 6.6517792810376, 46.7811447875451, 430.028033000082 ]
              ]
            ]
          }
        };
      });
    });

    it('should create a trail', function() {

      const expected = _.extend({
        length: Math.round(geoJsonLength(data.reqBody.geometry)),
        createdAfter: data.now,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/trails?include=geometry', data.reqBody)
        .set('Authorization', 'Bearer ' + data.admin.generateJwt())
        .then(expectTrail.inBody(expected));
    });
  });
});
