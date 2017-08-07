const _ = require('lodash');
const expectRes = require('../../spec/expectations/response');
const expectUser = require('../../spec/expectations/user');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');

describe.only('Users API', function() {

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

    it('should deny anonymous access', async function() {
      return spec
        .testApi('POST', '/users', data.reqBody)
        .then(expectRes.unauthorized({
          code: 'auth.missingAuthorization',
          message: 'Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'
        }));
    });

    it('should deny access to a user', async function() {
      const user = await userFixtures.user();
      return spec
        .testApi('POST', '/users', data.reqBody)
        .set('Authorization', `Bearer ${user.generateJwt()}`)
        .then(expectRes.forbidden({
          code: 'auth.forbidden',
          message: 'You are not authorized to access this resource. Authenticate with a user account that has more privileges.'
        }));
    });

    describe('as an admin', function() {
      beforeEach(function() {
        return spec.setUp(data, () => {
          data.admin = userFixtures.admin();
        });
      });

      it('should create a user', function() {

        const expected = _.defaults({
          active: false,
          role: 'user',
          loginCount: 0,
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectUser.inBody(expected));
      });

      it('should create an admin user', function() {

        data.reqBody.active = true;
        data.reqBody.role = 'admin';

        const expected = _.defaults({
          loginCount: 0,
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
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
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .send(body)
          .then(expectRes.invalid([
            {
              message: 'must not be blank',
              type: 'json',
              location: '/firstName',
              validator: 'notBlank',
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

    describe('as an invited user', function() {
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
          loginCount: 0,
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
        { property: 'active', value: false, description: 'set the status of a user' },
        { property: 'email', value: 'bar@example.com', description: 'set the e-mail of a user' },
        { property: 'role', value: 'admin', description: 'set the role of a user' }
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
            .then(expectRes.forbidden(changes.map(change => {
              return {
                message: `You are not authorized to ${change.description}. Authenticate with a user account that has more privileges.`,
                type: 'json',
                location: `/${change.property}`,
                validator: 'auth.unchanged',
                value: change.value,
                valueSet: true
              };
            })));
      });

      _.each(changes, function(change) {
        it(`should prevent modifying the "${change.property}" property`, async function() {

          const invitation = await generateInvitation({
            email: data.reqBody.email,
            role: 'user'
          });

          const body = { [change.property]: change.value };

          return spec
            .testApi('POST', '/users')
            .set('Authorization', `Bearer ${invitation}`)
            .send(body)
            .then(expectRes.forbidden({
              message: `You are not authorized to ${change.description}. Authenticate with a user account that has more privileges.`,
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

  describe('GET /users', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.users = [
          userFixtures.user({
            createdAt: moment().subtract(1, 'day').toDate()
          }),
          userFixtures.user({
            createdAt: moment().subtract(3, 'hours').toDate()
          }),
          userFixtures.admin({
            createdAt: moment().subtract(2, 'months').toDate()
          })
        ];

        data.user = Promise.all(data.users).then(users => users[0]);
        data.admin = Promise.all(data.users).then(users => users[2]);
      });
    });

    function getExpectedUser(index, changes) {
      const user = data.users[index];
      return _.extend({
        id: user.get('api_id'),
        firstName: user.get('first_name'),
        lastName: user.get('last_name'),
        email: user.get('email'),
        active: user.get('active'),
        role: user.get('role'),
        loginCount: user.get('login_count'),
        lastActiveAt: user.get('last_active_at'),
        lastLoginAt: user.get('last_login_at'),
        createdAt: user.get('created_at'),
        updatedAt: user.get('updated_at')
      }, changes);
    }

    describe('as an admin', function() {
      it('should retrieve users by descending creation date', function() {
        return spec
          .testRetrieve('/users')
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectUser.listInBody([
            getExpectedUser(1),
            getExpectedUser(0),
            getExpectedUser(2, {
              lastActiveAfter: data.now
            })
          ]));
      });
    });

    it('should deny anonymous access', function() {
      return spec
        .testApi('GET', '/users')
        .expect(expectRes.unauthorized({
          code: 'auth.missingAuthorization',
          message: 'Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'
        }));
    });

    it('should deny access to a user', function() {
      return spec
        .testApi('GET', '/users')
        .set('Authorization', `Bearer ${data.user.generateJwt()}`)
        .then(expectRes.forbidden({
          code: 'auth.forbidden',
          message: 'You are not authorized to access this resource. Authenticate with a user account that has more privileges.'
        }));
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
          .testRetrieve(`/users/${data.user.get('api_id')}`)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .then(expectUser.inBody(getExpectedExistingUser()));
      });

      it('should allow an admin to retrieve another user', function() {
        return userFixtures.admin().then(function(admin) {
          return spec
            .testRetrieve(`/users/${data.user.get('api_id')}`)
            .set('Authorization', `Bearer ${admin.generateJwt()}`)
            .then(expectUser.inBody(getExpectedExistingUser({ loginCount: 0 })));
        });
      });

      it('should not retrieve a non-existent user', function() {
        return spec
          .testApi('GET', '/users/foo')
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .expect(expectRes.notFound({
            code: 'record.notFound',
            message: 'No user was found with ID foo.'
          }));
      });

      it('should prevent a user from retrieving another user', function() {
        return userFixtures.user().then(function(anotherUser) {
          return spec
            .testApi('GET', `/users/${data.user.get('api_id')}`)
            .set('Authorization', `Bearer ${anotherUser.generateJwt()}`)
            .expect(expectRes.notFound({
              code: 'record.notFound',
              message: `No user was found with ID ${data.user.get('api_id')}.`
            }));
        });
      });

      it('should deny anonymous access', function() {
        return spec
          .testApi('GET', `/users/${data.user.get('api_id')}`)
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
          firstName: userFixtures.firstName(),
          lastName: userFixtures.lastName(),
          password: 'letmein',
          previousPassword: 'changeme'
        };

        const expected = getExpectedPatchedUser(body);

        return spec
          .testUpdate(`/users/${data.user.get('api_id')}`)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .send(body)
          .then(expectUser.inBody(expected));
      });

      it('should allow an admin to change any property', function() {

        const firstName = userFixtures.firstName();
        const lastName = userFixtures.lastName();
        const body = {
          firstName: firstName,
          lastName: lastName,
          active: false,
          email: userFixtures.email(firstName, lastName),
          role: 'admin',
          password: 'letmein'
        };

        const expected = getExpectedPatchedUser(_.defaults({
          loginCount: 0
        }, body))

        return userFixtures.admin().then(function(admin) {
          return spec
            .testUpdate(`/users/${data.user.get('api_id')}`)
            .set('Authorization', `Bearer ${admin.generateJwt()}`)
            .send(body)
            .then(expectUser.inBody(expected));
        });
      });

      it('should not accept invalid properties', function() {

        const body = {
          firstName: 42,
          lastName: '  \t \n ',
          password: '',
          previousPassword: 'foo'
        };

        return spec.testApi('PATCH', `/users/${data.user.get('api_id')}`)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .send(body)
          .then(expectRes.invalid([
            {
              validator: 'type',
              type: 'json',
              location: '/firstName',
              message: 'must be of type string',
              types: [ 'string' ],
              value: 42,
              valueSet: true
            },
            {
              validator: 'notBlank',
              type: 'json',
              location: '/lastName',
              message: 'must not be blank',
              value: '  \t \n ',
              valueSet: true
            },
            {
              validator: 'notBlank',
              type: 'json',
              location: '/password',
              message: 'must not be blank',
              value: '',
              valueSet: true
            },
            {
              validator: 'user.previousPassword',
              type: 'json',
              location: '/previousPassword',
              value: 'foo',
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
            .testApi('PATCH', `/users/${data.user.get('api_id')}`)
            .set('Authorization', `Bearer ${anotherUser.generateJwt()}`)
            .send(body)
            .expect(expectRes.notFound({
              code: 'record.notFound',
              message: `No user was found with ID ${data.user.get('api_id')}.`
            }));
        });
      });

      const changes = [
        { property: 'active', value: false, description: 'set the status of a user' },
        { property: 'email', value: 'bar@example.com', description: 'set the e-mail of a user' },
        { property: 'role', value: 'admin', description: 'set the role of a user' }
      ];

      it('should prevent a user from modifying admin properties', function() {

        const body = _.reduce(changes, (memo, change) => {
          memo[change.property] = change.value;
          return memo;
        }, {});

        return spec
          .testApi('PATCH', `/users/${data.user.get('api_id')}`)
          .set('Authorization', `Bearer ${data.user.generateJwt()}`)
          .send(body)
          .then(expectRes.forbidden(changes.map(change => {
            return {
              message: `You are not authorized to ${change.description}. Authenticate with a user account that has more privileges.`,
              type: 'json',
              location: `/${change.property}`,
              validator: 'auth.unchanged',
              value: change.value,
              valueSet: true
            };
          })));
      });

      _.each(changes, function(change) {
        it(`should prevent a user from modifying the "${change.property}" property`, function() {

          const body = { [change.property]: change.value };

          return spec
            .testApi('PATCH', `/users/${data.user.get('api_id')}`)
            .set('Authorization', `Bearer ${data.user.generateJwt()}`)
            .send(body)
            .then(expectRes.forbidden({
              message: `You are not authorized to ${change.description}. Authenticate with a user account that has more privileges.`,
              type: 'json',
              location: `/${change.property}`,
              validator: 'auth.unchanged',
              value: change.value,
              valueSet: true
            }));
        });
      });

      it('should deny anonymous access', function() {

        const body = {
          password: 'letmein',
          previousPassword: 'changeme'
        };

        return spec
          .testApi('PATCH', `/users/${data.user.get('api_id')}`)
          .send(body)
          .expect(expectRes.unauthorized({
            code: 'auth.missingAuthorization',
            message: 'Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'
          }));
      });
    });
  });
});
