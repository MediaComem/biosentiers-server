var _ = require('lodash'),
    expectRes = require('../../spec/expectations/response'),
    expectTrail = require('../../spec/expectations/trail'),
    jwt = require('../../lib/jwt'),
    moment = require('moment'),
    spec = require('../../spec/utils'),
    trailFixtures = require('../../spec/fixtures/trail'),
    userFixtures = require('../../spec/fixtures/user');

describe('Trails API', function() {

  var data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/trails', function() {
    beforeEach(function() {
      data.admin = userFixtures.admin();

      data.reqBody = {
        name: 'Over the rainbow'
      };

      return spec.setUp(data);
    });

    it('should create a trail', function() {

      var expected = _.extend({
        createdAfter: data.now,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/trails', data.reqBody)
        .set('Authorization', 'Bearer ' + data.admin.generateJwt())
        .then(expectTrail.inBody(expected));
    });
  });
});
