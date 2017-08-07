const _ = require('lodash');
const expectRes = require('../../spec/expectations/response');
const expectUser = require('../../spec/expectations/user');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');

describe('Users API', function() {

  let data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/users', function() {
    beforeEach(function() {

      const firstName = userFixtures.firstName();
      const lastName = userFixtures.lastName();

      data.reqBody = {
        firstName: firstName,
        lastName: lastName,
        email: userFixtures.email(firstName, lastName),
        password: 'letmein'
      };
    });

    describe('for an admin', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.admin = userFixtures.admin();
        });
      });

      it('should create a user', function() {

        const expected = _.defaults({
          active: false,
          role: 'user',
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', 'Bearer ' + data.admin.generateJwt())
          .then(expectUser.inBody(expected));
      });

      it('should create an admin user', function() {
        data.reqBody.active = true;
        data.reqBody.role = 'admin';

        const expected = _.defaults({
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', 'Bearer ' + data.admin.generateJwt())
          .then(expectUser.inBody(expected));
      });

      it('should not accept invalid properties', function() {

        const body = {
          firstName: '',
          lastName: 4,
          active: 42,
          email: 'foo'
        };

        return spec
          .testApi('POST', '/users')
          .set('Authorization', 'Bearer ' + data.admin.generateJwt())
          .send(body)
          .then(expectRes.invalid([
            {
              message: 'must not be empty',
              type: 'json',
              location: '/firstName',
              validator: 'notEmpty',
              value: '',
              valueSet: true
            },
            {
              message: 'must be of type string',
              type: 'json',
              location: '/lastName',
              validator: 'type',
              types: [ 'string' ],
              value: 4,
              valueSet: true
            },
            {
              message: 'must be of type boolean',
              type: 'json',
              location: '/active',
              validator: 'type',
              types: [ 'boolean' ],
              value: 42,
              valueSet: true
            },
            {
              message: 'is required',
              type: 'json',
              location: '/password',
              validator: 'required',
              valueSet: false
            },
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
    });

    describe('for an invited user', function() {
      beforeEach(function() {
        return spec.setUp(data);
      });

      function generateInvitation(changes) {
        return jwt.generateToken(_.extend({
          authType: 'invitation',
          email: data.reqBody.email,
          role: 'user'
        }, changes));
      }

      it('should create a user', async function() {
        const invitation = await generateInvitation();

        const expected = _.defaults({
          password: 'letmein',
          active: true,
          role: 'user',
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectUser.inBody(expected));
      });

      it('should create an admin user', async function() {
        const invitation = await generateInvitation({
          role: 'admin'
        });

        const expected = _.defaults({
          password: 'letmein',
          active: true,
          role: 'admin',
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectUser.inBody(expected));
      });

      it('should create a user with the first and last name in the invitation token by default', async function() {
        const firstName = userFixtures.firstName();
        const lastName = userFixtures.lastName();
        const invitation = await generateInvitation({
          firstName: firstName,
          lastName: lastName
        });

        data.reqBody = _.omit(data.reqBody, 'firstName', 'lastName');

        const expected = _.defaults({
          firstName: firstName,
          lastName: lastName,
          password: 'letmein',
          active: true,
          role: 'user',
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectUser.inBody(expected));
      });

      it('should accept unchanged admin properties', async function() {
        const invitation = await generateInvitation();

        _.extend(data.reqBody, {
          active: true,
          email: data.reqBody.email,
          role: 'user'
        });

        const expected = _.defaults({
          password: 'letmein',
          active: true,
          role: 'user',
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', `Bearer ${invitation}`)
          .then(expectUser.inBody(expected));
      });

      const changes = [
        { property: 'active', value: false, errorDescription: 'set the status of a user' },
        { property: 'email', value: 'bar@example.com', errorDescription: 'set the e-mail of a user' },
        { property: 'role', value: 'admin', errorDescription: 'set the role of a user' }
      ];

      it('should prevent modifying admin properties', async function() {
        const invitation = await generateInvitation({
          email: data.reqBody.email,
          role: 'user'
        });

        changes.forEach(change => data.reqBody[change.property] = change.value);

          return spec
            .testApi('POST', '/users')
            .set('Authorization', `Bearer ${invitation}`)
            .send(data.reqBody)
            .then(expectRes.forbidden([
              {
                message: 'You are not authorized to set the role of a user. Authenticate with a user account that has more privileges.',
                type: 'json',
                location: '/role',
                validator: 'auth.unchanged',
                value: 'admin',
                valueSet: true
              },
              {
                message: 'You are not authorized to set the e-mail of a user. Authenticate with a user account that has more privileges.',
                type: 'json',
                location: '/email',
                validator: 'auth.unchanged',
                value: 'bar@example.com',
                valueSet: true
              },
              {
                message: 'You are not authorized to set the status of a user. Authenticate with a user account that has more privileges.',
                type: 'json',
                location: '/active',
                validator: 'auth.unchanged',
                value: false,
                valueSet: true
              }
            ]));
      });

      _.each(changes, function(change) {
        it(`should prevent modifying the "${change.property}" property`, async function() {
          const invitation = await generateInvitation({
            email: data.reqBody.email,
            role: 'user'
          });

          const body = {};
          body[change.property] = change.value;

          return spec
            .testApi('POST', '/users')
            .set('Authorization', `Bearer ${invitation}`)
            .send(body)
            .then(expectRes.forbidden({
              message: `You are not authorized to ${change.errorDescription}. Authenticate with a user account that has more privileges.`,
              type: 'json',
              location: `/${change.property}`,
              validator: 'auth.unchanged',
              value: change.value,
              valueSet: true
            }));
        });
      });
    });
  });

  describe('with an existing user', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.threeDaysAgo = moment().subtract(3, 'days');

        const firstName = userFixtures.firstName();
        const lastName = userFixtures.lastName();

        data.userProps = {
          firstName: firstName,
          lastName: lastName,
          email: userFixtures.email(firstName, lastName),
          password: 'changeme',
          active: true,
          role: 'user',
          createdAt: data.threeDaysAgo.toDate()
        };

        data.user = userFixtures.user(data.userProps);
      });
    });

    function getExpectedExistingUser(changes) {
      return _.extend({
        id: data.user.get('api_id'),
        updatedAt: 'createdAt'
      }, data.userProps, changes);
    }

    describe('GET /api/users/:id', function() {

      it('should retrieve a user', function() {
        return spec
          .testRetrieve('/users/' + data.user.get('api_id'))
          .set('Authorization', 'Bearer ' + data.user.generateJwt())
          .then(expectUser.inBody(getExpectedExistingUser()));
      });

      it('should allow an admin to retrieve another user', function() {
        return userFixtures.admin().then(function(admin) {
          return spec
            .testRetrieve('/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + admin.generateJwt())
            .then(expectUser.inBody(getExpectedExistingUser({ loginCount: 0 })));
        });
      });

      it('should not retrieve a non-existent user', function() {
        return spec
          .testApi('GET', '/users/foo')
          .set('Authorization', 'Bearer ' + data.user.generateJwt())
          .expect(expectRes.notFound({
            code: 'record.notFound',
            message: 'No user was found with ID foo.'
          }));
      });

      it('should prevent a user from retrieving another user', function() {
        return userFixtures.user().then(function(anotherUser) {
          return spec
            .testApi('GET', '/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + anotherUser.generateJwt())
            .expect(expectRes.notFound({
              code: 'record.notFound',
              message: `No user was found with ID ${data.user.get('api_id')}.`
            }));
        });
      });

      it('should prevent an anonymous user from retrieving a user', function() {
        return spec
          .testApi('GET', '/users/' + data.user.get('api_id'))
          .expect(expectRes.unauthorized({
            code: 'auth.missingAuthorization',
            message: 'Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'
          }));
      });
    });

    describe('PATCH /api/users/:id', function() {

      function getExpectedPatchedUser(changes) {
        return getExpectedExistingUser(_.extend({
          updatedAt: null,
          updatedAfter: data.now
        }, changes));
      }

      it('should update a user', function() {

        const body = {
          password: 'letmein',
          previousPassword: 'changeme'
        };

        return spec
          .testUpdate('/users/' + data.user.get('api_id'))
          .set('Authorization', 'Bearer ' + data.user.generateJwt())
          .send(body)
          .then(expectUser.inBody(getExpectedPatchedUser(body)));
      });

      it('should allow an admin to change any property', function() {

        const body = {
          active: false,
          email: 'foo@example.com',
          role: 'admin'
        };

        const expected = getExpectedPatchedUser(_.defaults({
          loginCount: 0
        }, body))

        return userFixtures.admin().then(function(admin) {
          return spec
            .testUpdate('/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + admin.generateJwt())
            .send(body)
            .then(expectUser.inBody(expected));
        });
      });

      it('should not accept invalid properties', function() {

        const body = {
          password: '',
          previousPassword: 'foo'
        };

        return spec.testApi('PATCH', '/users/' + data.user.get('api_id'))
          .set('Authorization', 'Bearer ' + data.user.generateJwt())
          .send(body)
          .then(expectRes.invalid([
            {
              validator: 'notEmpty',
              type: 'json',
              location: '/password',
              message: 'must not be empty',
              value: '',
              valueSet: true
            }
          ]));
      });

      it('should prevent a user from updating another user', function() {

        const body = {
          password: 'letmein',
          previousPassword: 'changeme'
        };

        return userFixtures.user().then(function(anotherUser) {
          return spec
            .testApi('PATCH', '/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + anotherUser.generateJwt())
            .send(body)
            .expect(expectRes.notFound({
              code: 'record.notFound',
              message: `No user was found with ID ${data.user.get('api_id')}.`
            }));
        });
      });

      const changes = [
        { property: 'active', value: false, errorDescription: 'set the status of a user' },
        { property: 'email', value: 'bar@example.com', errorDescription: 'set the e-mail of a user' },
        { property: 'role', value: 'admin', errorDescription: 'set the role of a user' }
      ];

      _.each(changes, function(change) {
        it('should prevent a user from modifying the `' + change.property + '` property', function() {

          const body = {};
          body[change.property] = change.value;

          return spec
            .testApi('PATCH', '/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + data.user.generateJwt())
            .send(body)
            .then(expectRes.forbidden({
              message: `You are not authorized to ${change.errorDescription}. Authenticate with a user account that has more privileges.`,
              type: 'json',
              location: `/${change.property}`,
              validator: 'auth.unchanged',
              value: change.value,
              valueSet: true
            }));
        });
      });
    });
  });
});
