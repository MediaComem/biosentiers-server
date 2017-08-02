const _ = require('lodash');
const crypto = require('crypto');
const expect = require('chai').expect;
const expectRes = require('../../spec/expectations/response');
const expectJwt = require('../../spec/expectations/jwt');
const expectInstallation = require('../../spec/expectations/installation');
const expectUser = require('../../spec/expectations/user');
const installationFixtures = require('../../spec/fixtures/installation');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');
const uuid = require('uuid');

describe('Authentication API', function() {

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

    describe('with an installation', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.installation = installationFixtures.installation({
            properties: { foo: 'bar' }
          });

          data.reqBody = data.installation.then(installation => {

            const nonce = uuid.v4();
            const date = new Date().toISOString();
            const hmac = crypto.createHmac('sha512', installation.get('shared_secret'));
            hmac.update(`${nonce};${date}`);

            return {
              installation: installation.get('api_id'),
              nonce: nonce,
              date: date,
              authorization: hmac.digest('hex')
            };
          });
        });
      });

      it('should log in the installation', function() {

        const expected = {
          installation: {
            id: data.installation.get('api_id'),
            properties: { foo: 'bar' },
            createdBefore: data.now,
            updatedAt: 'createdAt'
          },
          token: {
            authType: 'installation',
            exp: moment(data.now).add(1, 'day').unix(),
            iat: data.now.unix(),
            sub: data.installation.get('api_id')
          }
        };

        return spec
          .testCreate('/auth', data.reqBody)
          .then(expectAuthenticatedInstallation.inBody(expected));
      });
    });
  });

  const expectAuthenticatedUser = spec.enrichExpectation((actual, expected) => {
    expect(actual).to.have.all.keys('token', 'user');
    expectUser(actual.user, expected.user);
    expectJwt(actual.token, expected.token);
  });

  const expectAuthenticatedInstallation = spec.enrichExpectation((actual, expected) => {
    expect(actual).to.have.all.keys('token', 'installation');
    expectInstallation(actual.installation, expected.installation);
    expectJwt(actual.token, expected.token);
  });
});
