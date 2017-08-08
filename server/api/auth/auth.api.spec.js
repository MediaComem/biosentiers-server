const _ = require('lodash');
const config = require('../../../config');
const crypto = require('crypto');
const expect = require('chai').expect;
const expectRes = require('../../spec/expectations/response');
const expectInstallation = require('../../spec/expectations/installation');
const expectJwt = require('../../spec/expectations/jwt');
const expectMails = require('../../spec/expectations/mails');
const expectUser = require('../../spec/expectations/user');
const installationFixtures = require('../../spec/fixtures/installation');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');

describe('Authentication API', function() {

  let data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/auth', function() {
    describe('as a user', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.password = userFixtures.password();
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
          user: getExpectedUser(data.user),
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

      it('should log in an admin', async function() {
        await data.user.save({ role: 'admin' });

        const expected = {
          user: getExpectedUser(data.user, {
            loginCount: 1,
            lastActiveAfter: data.now,
            lastLoginAfter: data.now
          }),
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

      it('should not log in a non-existent user', function() {
        data.reqBody.email = userFixtures.email();

        return spec
          .testApi('POST', '/auth', data.reqBody)
          .then(expectRes.unauthorized({
            code: 'auth.invalidUser',
            message: 'This user account does not exist or is inactive.'
          }));
      });

      it('should not log in an inactive user', async function() {
        await data.user.save({ active: false });

        return spec
          .testApi('POST', '/auth', data.reqBody)
          .then(expectRes.unauthorized({
            code: 'auth.invalidUser',
            message: 'This user account does not exist or is inactive.'
          }));
      });

      it('should not log in with the wrong password', function() {
        data.reqBody.password = userFixtures.password();

        return spec
          .testApi('POST', '/auth', data.reqBody)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The e-mail or password is invalid.'
          }));
      });

      it('should not log in with no credentials', function() {
        return spec
          .testApi('POST', '/auth')
          .then(expectRes.invalid([
            {
              message: 'is required',
              type: 'json',
              location: '/email',
              validator: 'required',
              valueSet: false
            },
            {
              message: 'is required',
              type: 'json',
              location: '/password',
              validator: 'required',
              valueSet: false
            }
          ]));
      });

      it('should not log in with invalid credentials', function() {
        data.reqBody.email = 'foo';
        data.reqBody.password = '   ';

        return spec
          .testApi('POST', '/auth', data.reqBody)
          .then(expectRes.invalid([
            {
              message: 'must be a valid e-mail address',
              type: 'json',
              location: '/email',
              validator: 'email',
              value: 'foo',
              valueSet: true
            },
            {
              message: 'must not be blank',
              type: 'json',
              location: '/password',
              validator: 'notBlank',
              value: '   ',
              valueSet: true
            }
          ]));
      });
    });

    describe('as an installation', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.installation = installationFixtures.installation({
            properties: { foo: 'bar' },
            createdAt: moment().subtract(2, 'days').toDate(),
            updatedAt: moment().subtract(15, 'minutes').toDate(),
            firstStartedAt: moment().subtract(1, 'day').toDate()
          });
        });
      });

      function generateInstallationAuth(installation, ...changes) {

        const data = _.extend({
          installation: installation.get('api_id'),
          nonce: installationFixtures.nonce(),
          date: new Date().toISOString(),
          secret: installation.get('shared_secret')
        }, ...changes);

        const hmac = crypto.createHmac('sha512', data.secret);
        hmac.update(`${data.installation};${data.nonce};${data.date}`);

        return _.extend(_.pick(data, 'installation', 'nonce', 'date'), {
          authorization: hmac.digest('hex')
        });
      }

      it('should log in the installation', function() {

        const body = generateInstallationAuth(data.installation);

        const expected = {
          installation: getExpectedInstallation(data.installation),
          token: {
            authType: 'installation',
            exp: moment(data.now).add(1, 'day').unix(),
            iat: data.now.unix(),
            sub: data.installation.get('api_id')
          }
        };

        return spec
          .testCreate('/auth', body)
          .then(expectAuthenticatedInstallation.inBody(expected));
      });

      it('should not log in a non-existent installation', function() {

        const body = generateInstallationAuth(data.installation);
        body.installation = installationFixtures.id();

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidInstallation',
            message: 'This installation does not exist or is inactive.'
          }));
      });

      it('should not log in another installation', async function() {

        const otherInstallation = await installationFixtures.installation();
        const body = generateInstallationAuth(data.installation);
        body.installation = otherInstallation.get('api_id');

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The provided authorization is invalid or has expired.'
          }));
      });

      it('should not log in with the wrong nonce', function() {

        const body = generateInstallationAuth(data.installation);
        body.nonce = installationFixtures.nonce();

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The provided authorization is invalid or has expired.'
          }));
      });

      it('should not log in with the wrong date', function() {

        const body = generateInstallationAuth(data.installation);
        body.date = moment().subtract(1, 'second').toISOString();

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The provided authorization is invalid or has expired.'
          }));
      });

      it('should not log in with a date too far in the past', function() {

        const body = generateInstallationAuth(data.installation, {
          date: moment().subtract(6, 'minutes').toISOString()
        });

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The provided authorization is invalid or has expired.'
          }));
      });

      it('should not log in with a date too far in the future', function() {

        const body = generateInstallationAuth(data.installation, {
          date: moment().add(6, 'minutes').toISOString()
        });

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The provided authorization is invalid or has expired.'
          }));
      });

      it('should not log in with the wrong authorization', function() {

        const body = generateInstallationAuth(data.installation);
        body.authorization = body.authorization.substring(0, body.authorization.length - 1);

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The provided authorization is invalid or has expired.'
          }));
      });

      it('should not log in with an authorization computed with the wrong secret', function() {

        const body = generateInstallationAuth(data.installation, {
          secret: crypto.randomBytes(256).toString('hex')
        });

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.unauthorized({
            code: 'auth.invalidCredentials',
            message: 'The provided authorization is invalid or has expired.'
          }));
      });

      it('should not log in with no credentials', function() {

        const body = {
          installation: data.installation.get('api_id')
        };

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.invalid([
            {
              message: 'is required',
              type: 'json',
              location: '/nonce',
              validator: 'required',
              valueSet: false
            },
            {
              message: 'is required',
              type: 'json',
              location: '/date',
              validator: 'required',
              valueSet: false
            },
            {
              message: 'is required',
              type: 'json',
              location: '/authorization',
              validator: 'required',
              valueSet: false
            }
          ]));
      });

      it('should not log in with invalid credentials', function() {

        const body = {
          installation: data.installation.get('api_id'),
          nonce: '   ',
          date: 'foo',
          authorization: 42
        };

        return spec
          .testApi('POST', '/auth', body)
          .then(expectRes.invalid([
            {
              message: 'must not be blank',
              type: 'json',
              location: '/nonce',
              validator: 'notBlank',
              value: body.nonce,
              valueSet: true
            },
            {
              message: 'is not a valid ISO-8601 date',
              type: 'json',
              location: '/date',
              validator: 'iso8601',
              value: body.date,
              valueSet: true
            },
            {
              message: 'must be of type string',
              type: 'json',
              location: '/authorization',
              validator: 'type',
              types: [ 'string' ],
              value: 42,
              valueSet: true
            }
          ]));
      });
    });
  });

  describe('POST /api/invitations', function() {
    describe('as an admin', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.admin = userFixtures.admin();

          data.reqBody = {
            email: userFixtures.email(),
            role: 'user',
            sent: true
          };
        });
      });

      function getExpectedInvitation(...changes) {
        return _.merge({
          email: data.reqBody.email,
          firstName: data.reqBody.firstName,
          lastName: data.reqBody.lastName,
          role: data.reqBody.role,
          sent: data.reqBody.sent,
          createdAfter: data.now,
          expiresAfter: moment(data.now).add(2, 'days').toDate(),
          token: getExpectedInvitationToken()
        }, ...changes);
      }

      function getExpectedInvitationAsAdmin(...changes) {
        return getExpectedInvitation({
          link: getInvitationLinkBaseUrl()
        }, ...changes);
      }

      function getExpectedInvitationMail(...changes) {
        return _.merge({
          from: `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
          to: data.reqBody.email,
          subject: 'Invitation BioSentiers',
          token: getExpectedInvitationToken()
        }, ...changes);
      }

      function getExpectedInvitationToken(...changes) {
        return _.extend({
          authType: 'invitation',
          email: data.reqBody.email,
          firstName: data.reqBody.firstName,
          lastName: data.reqBody.lastName,
          role: data.reqBody.role,
          sent: data.reqBody.sent,
          iat: moment(data.now).unix(),
          exp: moment(data.now).add(2, 'days').unix()
        }, ...changes);
      }

      it('should send an e-mail with an invitation link', function() {

        const expected = getExpectedInvitationAsAdmin({
          token: {
            iss: data.admin.get('api_id')
          }
        });

        const expectedMail = getExpectedInvitationMail({
          token: {
            iss: data.admin.get('api_id')
          }
        });

        return spec
          .testCreate('/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectInvitation.inBody(expected))
          .then(expectInvitationMailSent(expectedMail));
      });
    })
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

  function expectInvitationMailSent(expected) {

    const baseUrl = getInvitationLinkBaseUrl();
    const linkRegexp = /http\:\/\/localhost[^\s\n"]+/m;

    return function() {
      expectMails(expected, mail => {

        const textMatch = linkRegexp.exec(mail.text);
        expect(textMatch[0], 'mail.text.link').to.be.a('string');
        expectJwt(textMatch[0].substring(baseUrl.length), expected.token);

        const htmlMatch = linkRegexp.exec(mail.html);
        expect(htmlMatch[0], 'mail.html.link').to.be.a('string');
        expectJwt(htmlMatch[0].substring(baseUrl.length), expected.token);
      });
    };
  }

  const expectInvitation = spec.enrichExpectation((actual, expected) => {

    const keys = [ 'email', 'role', 'sent', 'createdAt', 'expiresAt' ];
    _.each([ 'firstName', 'lastName', 'link' ], property => {
      if (expected[property]) {
        keys.push(property);
      }
    });

    expect(actual, 'invitation').to.have.all.keys(keys);

    expect(actual.email, 'invitation.email').to.equal(expected.email);
    expect(actual.role, 'invitation.role').to.equal(expected.role);
    expect(actual.sent, 'invitation.sent').to.equal(expected.sent);
    spec.expectTimestamp('invitation', actual, expected, 'created');
    spec.expectTimestamp('invitation', actual, expected, 'expires');

    if (expected.firstName) {
      expect(actual.firstName, 'invitation.firstName').to.equal(expected.firstName);
    } else {
      expect(actual, 'invitation.firstName').not.to.have.property('firstName');
    }

    if (expected.lastName) {
      expect(actual.lastName, 'invitation.lastName').to.equal(expected.lastName);
    } else {
      expect(actual, 'invitation.lastName').not.to.have.property('lastName');
    }

    if (expected.link) {
      expect(actual.link, 'invitation.link').to.startWith(expected.link);
      expectJwt(actual.link.slice(expected.link.length), expected.token);
    } else {
      expect(actual, 'invitation.link').not.to.have.property('link');
    }
  });

  function getExpectedInstallation(installation) {
    return {
      id: data.installation.get('api_id'),
      properties: data.installation.get('properties'),
      eventsCount: data.installation.get('events_count'),
      createdAt: data.installation.get('created_at'),
      updatedAt: data.installation.get('updated_at'),
      firstStartedAt: data.installation.get('first_started_at')
    };
  }

  function getExpectedUser(user, ...changes) {
    return _.extend({
      id: user.get('api_id'),
      email: user.get('email'),
      firstName: user.get('first_name'),
      lastName: user.get('last_name'),
      active: user.get('active'),
      role: user.get('role'),
      createdAt: user.get('created_at'),
      updatedAt: user.get('updated_at')
    }, ...changes);
  }

  function getInvitationLinkBaseUrl() {
    return `${config.baseUrl}/register/complete?invitation=`;
  }
});
