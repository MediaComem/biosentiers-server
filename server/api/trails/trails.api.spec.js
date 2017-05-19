const _ = require('lodash');
const expectRes = require('../../spec/expectations/response');
const expectTrail = require('../../spec/expectations/trail');
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
      data.admin = userFixtures.admin();

      data.reqBody = {
        name: 'Over the rainbow'
      };

      return spec.setUp(data);
    });

    it('should create a trail', function() {

      const expected = _.extend({
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
