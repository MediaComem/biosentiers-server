const _ = require('lodash');
const expect = require('chai').expect;
const expectRes = require('../../spec/expectations/response');
const expectJwt = require('../../spec/expectations/jwt');
const expectUser = require('../../spec/expectations/user');
const installationFixtures = require('../../spec/fixtures/installation');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');

describe.only('Authentication API', function() {

  let data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/auth', function() {
    describe('with a user', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.password = 'foobar';
          data.user = userFixtures.user({
            password: data.password
          });

          data.reqBody = data.user.then(user => {
            return {
              email: user.get('email'),
              password: data.password
            };
          });
        });
      });

      it('should log in the user', function() {

        const expected = {
          user: {
            id: data.user.get('api_id'),
            email: data.user.get('email'),
            firstName: data.user.get('first_name'),
            lastName: data.user.get('last_name'),
            active: true,
            role: 'user',
            createdBefore: data.now,
            updatedAt: 'createdAt'
          },
          token: {
            authType: 'user',
            exp: moment(data.now).add(2, 'weeks').unix(),
            iat: data.now.unix(),
            sub: data.user.get('api_id')
          }
        };

        return spec
          .testCreate('/auth', data.reqBody)
          .then(expectAuthenticatedUser.inBody(expected));
      });
    });
  });

  const expectAuthenticatedUser = spec.enrichExpectation(function(actual, expected) {
    expectUser(actual.user, expected.user);
    expectJwt(actual.token, expected.token);
  });
});
