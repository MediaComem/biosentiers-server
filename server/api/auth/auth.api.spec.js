const _ = require('lodash');
const config = require('../../../config');
const crypto = require('crypto');
const expect = require('chai').expect;
const expectInstallation = require('../../spec/expectations/installation');
const expectInvitation = require('../../spec/expectations/invitation');
const expectJwt = require('../../spec/expectations/jwt');
const expectMails = require('../../spec/expectations/mails');
const expectPasswordReset = require('../../spec/expectations/password-reset');
const expectRes = require('../../spec/expectations/response');
const expectUser = require('../../spec/expectations/user');
const installationFixtures = require('../../spec/fixtures/installation');
const jwt = require('../../lib/jwt');
const mails = require('../../mails');
const moment = require('moment');
const spec = require('../../spec/utils');
const User = require('../../models/user');
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
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.reqBody = {
          email: userFixtures.email()
        };
      });
    });

    function getExpectedInvitation(...changes) {
      return _.merge({
        email: data.reqBody.email,
        firstName: data.reqBody.firstName,
        lastName: data.reqBody.lastName,
        role: data.reqBody.role || 'user',
        sent: _.get(data.reqBody, 'sent', true),
        createdAfter: moment(data.now).startOf('second').subtract(1, 'millisecond').toDate(),
        expiresAfter: moment(data.now).add(2, 'days').startOf('second').subtract(1, 'millisecond').toDate(),
        token: getExpectedInvitationToken()
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
        role: data.reqBody.role || 'user',
        sent: _.get(data.reqBody, 'sent', true),
        iat: moment(data.now).unix(),
        exp: moment(data.now).add(2, 'days').unix()
      }, ...changes);
    }

    describe('as an anonymous user', function() {
      it('should send an e-mail with an invitation link', function() {

        const expected = getExpectedInvitation();

        const expectedMail = getExpectedInvitationMail({
          type: 'welcome'
        });

        return spec
          .testCreate('/auth/invitations', data.reqBody)
          .then(expectInvitation.inBody(expected))
          .then(expectInvitationMailSent(expectedMail));
      });

      it('should not send an e-mail if a user already has that e-mail address', async function() {
        await userFixtures.user({
          email: data.reqBody.email
        });

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .then(expectMails.none)
          .then(expectRes.invalid({
            message: 'is already taken',
            type: 'json',
            location: '/email',
            validator: 'user.emailAvailable',
            value: data.reqBody.email,
            valueSet: true
          }));
      });

      it('should not accept invalid properties', function() {
        _.extend(data.reqBody, {
          email: 'foo'
        });

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .then(expectMails.none)
          .then(expectRes.invalid([
            {
              message: 'must be a valid e-mail address',
              type: 'json',
              location: '/email',
              validator: 'email',
              value: 'foo',
              valueSet: true
            }
          ]));
      });

      it('should not create an invitation for an admin user', function() {
        data.reqBody.role = 'admin';

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .then(expectMails.none)
          .then(expectRes.forbidden([
            {
              message: 'You are not authorized to set the role of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/role',
              validator: 'auth.unchanged',
              value: 'admin',
              valueSet: true
            }
          ]))
      });

      it('should not create an invitation without sending an e-mail', function() {
        data.reqBody.sent = false;

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .then(expectMails.none)
          .then(expectRes.forbidden([
            {
              message: 'You are not authorized to set the status of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/sent',
              validator: 'auth.unchanged',
              value: false,
              valueSet: true
            }
          ]))
      });

      it('should not create an invitation with unauthorized values', function() {
        data.reqBody.role = 'admin';
        data.reqBody.sent = false;

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .then(expectMails.none)
          .then(expectRes.forbidden([
            {
              message: 'You are not authorized to set the role of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/role',
              validator: 'auth.unchanged',
              value: 'admin',
              valueSet: true
            },
            {
              message: 'You are not authorized to set the status of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/sent',
              validator: 'auth.unchanged',
              value: false,
              valueSet: true
            }
          ]))
      });
    });

    describe('as a user', function() {
      beforeEach(async function() {
        data.user = await userFixtures.user();
      });

      it('should send an e-mail with an invitation link', function() {

        const expected = getExpectedInvitation({
          token: {
            iss: data.user.get('api_id')
          }
        });

        const expectedMail = getExpectedInvitationMail({
          type: 'welcome',
          token: {
            iss: data.user.get('api_id')
          }
        });

        return spec
          .testCreate('/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .then(expectInvitation.inBody(expected))
          .then(expectInvitationMailSent(expectedMail));
      });

      it('should not send an e-mail if a user already has that e-mail address', async function() {
        await userFixtures.user({
          email: data.reqBody.email
        });

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .then(expectMails.none)
          .then(expectRes.invalid({
            message: 'is already taken',
            type: 'json',
            location: '/email',
            validator: 'user.emailAvailable',
            value: data.reqBody.email,
            valueSet: true
          }));
      });

      it('should not accept invalid properties', function() {
        _.extend(data.reqBody, {
          email: 'foo'
        });

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .then(expectMails.none)
          .then(expectRes.invalid([
            {
              message: 'must be a valid e-mail address',
              type: 'json',
              location: '/email',
              validator: 'email',
              value: 'foo',
              valueSet: true
            }
          ]));
      });

      it('should not create an invitation for an admin user', function() {
        data.reqBody.role = 'admin';

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .then(expectMails.none)
          .then(expectRes.forbidden([
            {
              message: 'You are not authorized to set the role of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/role',
              validator: 'auth.unchanged',
              value: 'admin',
              valueSet: true
            }
          ]))
      });

      it('should not create an invitation without sending an e-mail', function() {
        data.reqBody.sent = false;

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .then(expectMails.none)
          .then(expectRes.forbidden([
            {
              message: 'You are not authorized to set the status of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/sent',
              validator: 'auth.unchanged',
              value: false,
              valueSet: true
            }
          ]))
      });

      it('should not create an invitation with unauthorized values', function() {
        data.reqBody.role = 'admin';
        data.reqBody.sent = false;

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .then(expectMails.none)
          .then(expectRes.forbidden([
            {
              message: 'You are not authorized to set the role of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/role',
              validator: 'auth.unchanged',
              value: 'admin',
              valueSet: true
            },
            {
              message: 'You are not authorized to set the status of an invitation. Authenticate with a user account that has more privileges.',
              type: 'json',
              location: '/sent',
              validator: 'auth.unchanged',
              value: false,
              valueSet: true
            }
          ]))
      });
    });

    describe('as an admin', function() {
      beforeEach(async function() {
        data.admin = await userFixtures.admin();
      });

      function getExpectedInvitationAsAdmin(...changes) {
        return getExpectedInvitation({
          link: getInvitationLinkBaseUrl()
        }, ...changes);
      }

      it('should send an e-mail with an invitation link', function() {

        const expected = getExpectedInvitationAsAdmin({
          token: {
            iss: data.admin.get('api_id')
          }
        });

        const expectedMail = getExpectedInvitationMail({
          type: 'welcome',
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

      it('should create an invitation for an admin user', function() {
        data.reqBody.role = 'admin';

        const expected = getExpectedInvitationAsAdmin({
          token: {
            iss: data.admin.get('api_id')
          }
        });

        const expectedMail = getExpectedInvitationMail({
          type: 'welcome',
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

      it('should create an invitation without sending an e-mail', function() {
        data.reqBody.sent = false;

        const expected = getExpectedInvitationAsAdmin({
          token: {
            iss: data.admin.get('api_id')
          }
        });

        return spec
          .testCreate('/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectInvitation.inBody(expected))
          .then(expectMails.none);
      });

      it('should not send an e-mail if a user already has that e-mail address', async function() {
        await userFixtures.user({
          email: data.reqBody.email
        });

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectMails.none)
          .then(expectRes.invalid({
            message: 'is already taken',
            type: 'json',
            location: '/email',
            validator: 'user.emailAvailable',
            value: data.reqBody.email,
            valueSet: true
          }));
      });

      it('should not accept invalid properties', function() {
        _.extend(data.reqBody, {
          email: 'foo',
          role: 'god',
          sent: 1
        });

        return spec
          .testApi('POST', '/auth/invitations', data.reqBody)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectMails.none)
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
              message: 'must be one of user, admin',
              type: 'json',
              location: '/role',
              validator: 'inclusion',
              allowedValues: [ 'user', 'admin' ],
              allowedValuesDescription: 'user, admin',
              value: 'god',
              valueSet: true
            },
            {
              message: 'must be of type boolean',
              type: 'json',
              location: '/sent',
              validator: 'type',
              types: [ 'boolean' ],
              value: 1,
              valueSet: true
            }
          ]));
      });
    });
  });

  describe('GET /api/invitations', function() {
    beforeEach(function() {
      return spec.setUp(data);
    });

    function getExpectedInvitation(...changes) {

      const now = data.now || new Date();

      return _.extend({
        role: 'user',
        sent: true,
        createdAfter: moment(now).startOf('second').subtract(1, 'millisecond').toDate(),
        expiresAfter: moment(now).add(2, 'days').startOf('second').subtract(1, 'millisecond').toDate()
      }, ...changes);
    }

    it('should deny anonymous access', function() {
      return spec
        .testApi('GET', '/auth/invitations')
        .then(expectRes.unauthorized({
          code: 'auth.missingAuthorization',
          message: 'Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'
        }));
    });

    it('should deny access to a user', async function() {

      const user = await userFixtures.user();

      return spec
        .testApi('GET', '/auth/invitations')
        .set('Authorization', `Bearer ${user.generateJwt()}`)
        .then(expectRes.unauthorized({
          code: 'auth.invalidAuthorization',
          message: 'The Bearer token supplied in the Authorization header is invalid or has expired.'
        }));
    });

    it('should deny access to an admin', async function() {

      const admin = await userFixtures.admin();

      return spec
        .testApi('GET', '/auth/invitations')
        .set('Authorization', `Bearer ${admin.generateJwt()}`)
        .then(expectRes.unauthorized({
          code: 'auth.invalidAuthorization',
          message: 'The Bearer token supplied in the Authorization header is invalid or has expired.'
        }));
    });

    describe('as an invited user', function() {
      it('should retrieve the authenticated invitation', function() {

        const email = userFixtures.email();
        const invitation = generateInvitationToken({
          email: email
        });

        const expected = getExpectedInvitation({
          email: email
        });

        return spec
          .testRetrieve('/auth/invitations')
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectInvitation.listInBody([ expected ]));
      });

      it('should retrieve an invitation for an admin user', function() {

        const email = userFixtures.email();
        const invitation = generateInvitationToken({
          email: email,
          role: 'admin'
        });

        const expected = getExpectedInvitation({
          email: email,
          role: 'admin'
        });

        return spec
          .testRetrieve('/auth/invitations')
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectInvitation.listInBody([ expected ]));
      });

      it('should retrieve an invitation that was not sent', function() {

        const email = userFixtures.email();
        const invitation = generateInvitationToken({
          email: email,
          sent: false
        });

        const expected = getExpectedInvitation({
          email: email,
          sent: false
        });

        return spec
          .testRetrieve('/auth/invitations')
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectInvitation.listInBody([ expected ]));
      });

      it('should not retrieve an invitation that has been used', async function() {

        const user = await userFixtures.user();
        const invitation = generateInvitationToken({
          email: user.get('email')
        });

        return spec
          .testApi('GET', '/auth/invitations')
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectRes.unauthorized({
            code: 'auth.invalidAuthorization',
            message: 'The Bearer token supplied in the Authorization header is invalid or has expired.'
          }));
      })
    });
  });

  describe('POST /auth/passwordResets', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.user = userFixtures.user();
        data.reqBody = data.user.then(user => ({
          email: user.get('email')
        }));
      });
    });

    function getExpectedPasswordResetMail(user, ...changes) {
      return _.merge({
        from: `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
        to: data.reqBody.email,
        subject: 'Changement de mot de passe BioSentiers',
        token: getExpectedPasswordResetToken(user)
      }, ...changes);
    }

    it('should deny access to a user', async function() {

      const user = await userFixtures.user();

      return spec
        .testApi('POST', '/auth/passwordResets', data.reqBody)
        .set('Authorization', `Bearer ${user.generateJwt()}`)
        .then(expectRes.forbidden({
          code: 'auth.forbidden',
          message: 'You are not authorized to access this resource. Authenticate with a user account that has more privileges.'
        }));
    });

    describe('as an anonymous user', function() {
      it('should send a password reset e-mail', function() {

        const expected = getExpectedPasswordReset();

        const expectedMail = getExpectedPasswordResetMail(data.user, {
          type: 'passwordReset',
          token: {
            passwordResetCount: data.user.get('password_reset_count') + 1
          }
        });

        const expectedUser = getExpectedUser(data.user, {
          passwordResetCount: data.user.get('password_reset_count') + 1
        });

        return spec
          .testCreate('/auth/passwordResets', data.reqBody)
          .then(expectPasswordReset.inBody(expected))
          .then(expectPasswordResetMailSent(expectedMail))
          .then(expectUser.inDb(expectedUser));
      });

      it('should send a password reset e-mail for an admin', async function() {
        await data.user.save({ role: 'admin' });

        const expected = getExpectedPasswordReset();

        const expectedMail = getExpectedPasswordResetMail(data.user, {
          type: 'passwordReset',
          token: {
            passwordResetCount: data.user.get('password_reset_count') + 1
          }
        });

        const expectedUser = getExpectedUser(data.user, {
          passwordResetCount: data.user.get('password_reset_count') + 1
        });

        return spec
          .testCreate('/auth/passwordResets', data.reqBody)
          .then(expectPasswordReset.inBody(expected))
          .then(expectPasswordResetMailSent(expectedMail))
          .then(expectUser.inDb(expectedUser));
      });

      it('should not accept invalid properties', function() {

        data.reqBody = {
          email: 'foo'
        };

        const expectedUser = getExpectedUser(data.user);

        return spec
          .testApi('POST', '/auth/passwordResets', data.reqBody)
          .then(expectRes.invalid({
            message: 'must be a valid e-mail address',
            type: 'json',
            location: '/email',
            validator: 'email',
            value: 'foo',
            valueSet: true
          }))
          .then(expectMails.none)
          .then(expectUser.inDb(expectedUser));
      });

      it('should not send a password reset e-mail for a user that does not exist', function() {

        data.reqBody.email = userFixtures.email();

        const expectedUser = getExpectedUser(data.user);

        return spec
          .testApi('POST', '/auth/passwordResets', data.reqBody)
          .then(expectRes.invalid({
            message: 'does not exist',
            type: 'json',
            location: '/email',
            validator: 'user.emailExists',
            value: data.reqBody.email,
            valueSet: true
          }))
          .then(expectMails.none)
          .then(expectUser.inDb(expectedUser));
      });
    });

    describe('as an admin', function() {
      it('should create a password reset token without sending an e-mail', async function() {

        const admin = await userFixtures.admin();
        const expected = getExpectedPasswordResetAsAdmin(data.user, {
          user: {
            passwordResetCount: data.user.get('password_reset_count') + 1
          },
          token: {
            iss: admin.get('api_id'),
            passwordResetCount: data.user.get('password_reset_count') + 1
          }
        });

        const expectedMail = getExpectedPasswordResetMail(data.user, {
          type: 'passwordReset'
        });

        const expectedUser = getExpectedUser(data.user, {
          passwordResetCount: data.user.get('password_reset_count') + 1
        });

        return spec
          .testCreate('/auth/passwordResets', data.reqBody)
          .set('Authorization', `Bearer ${admin.generateJwt()}`)
          .then(expectPasswordReset.inBody(expected))
          .then(expectMails.none)
          .then(expectUser.inDb(expectedUser));
      });

      it('should not accept invalid properties', async function() {

        const admin = await userFixtures.admin();
        data.reqBody = {
          email: 'foo'
        };

        const expectedUser = getExpectedUser(data.user);

        return spec
          .testApi('POST', '/auth/passwordResets', data.reqBody)
          .set('Authorization', `Bearer ${admin.generateJwt()}`)
          .then(expectRes.invalid({
            message: 'must be a valid e-mail address',
            type: 'json',
            location: '/email',
            validator: 'email',
            value: 'foo',
            valueSet: true
          }))
          .then(expectMails.none)
          .then(expectUser.inDb(expectedUser));
      });

      it('should not send a password reset e-mail for a user that does not exist', async function() {

        const admin = await userFixtures.admin();
        data.reqBody.email = userFixtures.email();

        const expectedUser = getExpectedUser(data.user);

        return spec
          .testApi('POST', '/auth/passwordResets', data.reqBody)
          .set('Authorization', `Bearer ${admin.generateJwt()}`)
          .then(expectRes.invalid({
            message: 'does not exist',
            type: 'json',
            location: '/email',
            validator: 'user.emailExists',
            value: data.reqBody.email,
            valueSet: true
          }))
          .then(expectMails.none)
          .then(expectUser.inDb(expectedUser));
      });
    });
  });

  describe('GET /auth/passwordResets', function() {
    it('should deny anonymous access', function() {
      return spec
        .testApi('GET', '/auth/passwordResets')
        .then(expectRes.unauthorized({
          code: 'auth.missingAuthorization',
          message: 'Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'
        }));
    });

    it('should deny access to a user', async function() {

      const user = await userFixtures.user();

      return spec
        .testApi('GET', '/auth/passwordResets')
        .set('Authorization', `Bearer ${user.generateJwt()}`)
        .then(expectRes.unauthorized({
          code: 'auth.invalidAuthorization',
          message: 'The Bearer token supplied in the Authorization header is invalid or has expired.'
        }));
    });

    it('should deny access to an admin', async function() {

      const admin = await userFixtures.admin();

      return spec
        .testApi('GET', '/auth/passwordResets')
        .set('Authorization', `Bearer ${admin.generateJwt()}`)
        .then(expectRes.unauthorized({
          code: 'auth.invalidAuthorization',
          message: 'The Bearer token supplied in the Authorization header is invalid or has expired.'
        }));
    });

    describe('with a password reset token', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.user = userFixtures.user();
        });
      });

      it('should retrieve the authenticated password reset request', function() {

        const passwordResetToken = generatePasswordResetToken(data.user);
        const expected = getExpectedPasswordReset({
          email: data.user.get('email')
        });

        return spec
          .testRetrieve('/auth/passwordResets')
          .set('Authorization', `Bearer ${passwordResetToken}`)
          .then(expectPasswordReset.listInBody([ expected ]));
      });

      it('should retrieve a password reset request for an admin', async function() {

        await data.user.save({ role: 'admin' });

        const passwordResetToken = generatePasswordResetToken(data.user);
        const expected = getExpectedPasswordReset({
          email: data.user.get('email')
        });

        return spec
          .testRetrieve('/auth/passwordResets')
          .set('Authorization', `Bearer ${passwordResetToken}`)
          .then(expectPasswordReset.listInBody([ expected ]));
      });

      it('should not retrieve a password reset request that has been used', function() {

        const passwordResetToken = generatePasswordResetToken(data.user);
        data.user.save({ password_reset_count: data.user.get('password_reset_count') + 1 });

        return spec
          .testApi('GET', '/auth/passwordResets')
          .set('Authorization', `Bearer ${passwordResetToken}`)
          .then(expectRes.unauthorized({
            code: 'auth.invalidAuthorization',
            message: 'The Bearer token supplied in the Authorization header is invalid or has expired.'
          }));
      });

      it('should not retrieve a password reset request with an invalid password reset count', function() {

        const passwordResetToken = generatePasswordResetToken(data.user, {
          passwordResetToken: 42
        });

        data.user.save({ password_reset_count: 24 });

        return spec
          .testApi('GET', '/auth/passwordResets')
          .set('Authorization', `Bearer ${passwordResetToken}`)
          .then(expectRes.unauthorized({
            code: 'auth.invalidAuthorization',
            message: 'The Bearer token supplied in the Authorization header is invalid or has expired.'
          }));
      });
    });
  });

  const expectAuthenticatedUser = spec.enrichExpectation(async (actual, expected) => {
    expect(actual).to.have.all.keys('token', 'user');
    await expectUser(actual.user, expected.user);
    expectJwt(actual.token, expected.token);
  });

  const expectAuthenticatedInstallation = spec.enrichExpectation(async (actual, expected) => {
    expect(actual).to.have.all.keys('token', 'installation');
    await expectInstallation(actual.installation, expected.installation);
    expectJwt(actual.token, expected.token);
  });

  function expectInvitationMailSent(expected) {

    const baseUrl = getInvitationLinkBaseUrl();
    const linkRegexp = /http\:\/\/localhost[^\s\n"]+/m;
    const type = expected.type;

    return function() {
      expectMails(_.omit(expected, 'type'), mail => {

        const textMatch = linkRegexp.exec(mail.text);
        expect(textMatch[0], 'mail.text.link').to.be.a('string');

        const textJwt = textMatch[0].substring(baseUrl.length);
        expectJwt(textJwt, expected.token);
        expect(mail.text, 'mail.text').to.equal(mails[type].txt({
          link: `${baseUrl}${textJwt}`
        }));

        const htmlMatch = linkRegexp.exec(mail.html);
        expect(htmlMatch[0], 'mail.html.link').to.be.a('string');

        const htmlJwt = htmlMatch[0].substring(baseUrl.length);
        expectJwt(htmlJwt, expected.token);
        expect(mail.html, 'mail.html').to.equal(mails[type].html({
          link: `${baseUrl}${htmlJwt}`
        }));
      });
    };
  }

  function expectPasswordResetMailSent(expected) {

    const baseUrl = getPasswordResetLinkBaseUrl();
    const linkRegexp = /http\:\/\/localhost[^\s\n"]+/m;
    const type = expected.type;

    return function() {
      expectMails(_.omit(expected, 'type'), mail => {

        const textMatch = linkRegexp.exec(mail.text);
        expect(textMatch[0], 'mail.text.link').to.be.a('string');

        const textJwt = textMatch[0].substring(baseUrl.length);
        expectJwt(textJwt, expected.token);
        expect(mail.text, 'mail.text').to.equal(mails[type].txt({
          link: `${baseUrl}${textJwt}`
        }));

        const htmlMatch = linkRegexp.exec(mail.html);
        expect(htmlMatch[0], 'mail.html.link').to.be.a('string');

        const htmlJwt = htmlMatch[0].substring(baseUrl.length);
        expectJwt(htmlJwt, expected.token);
        expect(mail.html, 'mail.html').to.equal(mails[type].html({
          link: `${baseUrl}${htmlJwt}`
        }));
      });
    };
  }

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

  function getExpectedPasswordReset(...changes) {
    return _.merge({
      email: _.get(data, 'reqBody.email'),
      createdAfter: moment(data.now).startOf('second').subtract(1, 'millisecond').toDate()
    }, ...changes);
  }

  function getExpectedPasswordResetToken(user, ...changes) {
    return _.extend({
      authType: 'passwordReset',
      email: _.get(data, 'reqBody.email'),
      passwordResetCount: user.get('password_reset_count'),
      sub: user.get('api_id'),
      iat: moment(data.now).unix(),
      exp: moment(data.now).add(1, 'hour').unix()
    }, ...changes);
  }

  function getExpectedPasswordResetAsAdmin(user, ...changes) {
    return getExpectedPasswordReset({
      link: getPasswordResetLinkBaseUrl(),
      token: getExpectedPasswordResetToken(user),
      user: getExpectedUserAsAdmin(user)
    }, ...changes);
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

  function getExpectedUserAsAdmin(user, ...changes) {
    return getExpectedUser(user, {
      loginCount: user.get('login_count'),
      lastLoginAt: user.get('last_login_at'),
      lastActiveAt: user.get('last_active_at')
    }, ...changes);
  }

  function getInvitationLinkBaseUrl() {
    return `${config.baseUrl}/register/complete?invitation=`;
  }

  function getPasswordResetLinkBaseUrl() {
    return `${config.baseUrl}/resetPassword?otp=`;
  }

  function generateInvitationToken(...changes) {

    const now = moment();

    const claims = _.extend({
      authType: 'invitation',
      role: 'user',
      iat: now.unix(),
      exp: moment(now).add(2, 'days').unix(),
      sent: true
    }, ...changes);

    if (!claims.email) {
      throw new Error('"email" claim is required');
    }

    return jwt.generateToken(claims);
  }

  function generatePasswordResetToken(user, ...changes) {

    const now = moment();

    return jwt.generateToken(_.extend({
      authType: 'passwordReset',
      email: user.get('email'),
      passwordResetCount: user.get('password_reset_count'),
      sub: user.get('api_id'),
      iat: now.unix(),
      exp: moment(now).add(1, 'hour').unix()
    }, ...changes));
  }
});
