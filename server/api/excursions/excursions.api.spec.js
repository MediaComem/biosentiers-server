var _ = require('lodash'),
    expectRes = require('../../spec/expectations/response'),
    expectExcursion = require('../../spec/expectations/excursion'),
    jwt = require('../../lib/jwt'),
    moment = require('moment'),
    spec = require('../../spec/utils'),
    trailFixtures = require('../../spec/fixtures/trail'),
    userFixtures = require('../../spec/fixtures/user');

describe('Excursions API', function() {

  var data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/excursions', function() {
    beforeEach(function() {
      data.user = userFixtures.user();
      data.trail = trailFixtures.trail();

      data.reqBody = {
        trailId: data.trail.call('get', 'api_id'),
        plannedAt: moment().add(2, 'days').toDate()
      };

      return spec.setUp(data);
    });

    it('should create an excursion', function() {

      var expected = _.extend({
        createdAfter: data.now,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/excursions', data.reqBody)
        .set('Authorization', 'Bearer ' + data.user.generateJwt())
        .then(expectExcursion.inBody(expected));
    });
  });
});
