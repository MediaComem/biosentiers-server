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
      data.reqBody = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
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

        const expected = _.extend({
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

      it('should not accept invalid properties', function() {

        const body = {
          firstName: '',
          lastName: 4,
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
              message: 'is required',
              type: 'json',
              location: '/password',
              validator: 'required',
              valueSet: false
            },
            {
              message: 'must be of type string',
              type: 'json',
              location: '/lastName',
              validator: 'type',
              typeDescription: 'string',
              value: 4,
              valueSet: true
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
        return spec.setUp(data, () => {
          data.invitation = jwt.generateToken({
            authType: 'invitation',
            email: data.reqBody.email,
            role: 'user'
          });
        });
      });

      it('should create a user', function() {

        const expected = _.extend({
          password: 'letmein',
          active: true,
          role: 'user',
          createdAfter: data.now,
          updatedAt: 'createdAt'
        }, data.reqBody);

        return spec
          .testCreate('/users', data.reqBody)
          .set('Authorization', 'Bearer ' + data.invitation)
          .then(expectUser.inBody(expected));
      });
    });
  });

  function addExistingUserData(changes) {
    data.threeDaysAgo = moment().subtract(3, 'days');

    data.userProps = _.extend({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'changeme',
      active: true,
      role: 'user',
      createdAt: data.threeDaysAgo.toDate()
    }, changes);

    data.user = userFixtures.user(data.userProps);
  }

  function getExpectedExistingUser(changes) {
    return _.extend({
      id: data.user.get('api_id'),
      updatedBefore: data.now
    }, data.userProps, changes);
  }

  describe('GET /api/users/:id', function() {
    describe('with an existing user', function() {

      beforeEach(function() {
        return spec.setUp(data, () => {
          addExistingUserData(data);
        });
      });

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
            .then(expectUser.inBody(getExpectedExistingUser()));
        });
      });

      it('should not retrieve a non-existent user', function() {
        return spec
          .testApi('GET', '/users/foo')
          .set('Authorization', 'Bearer ' + data.user.generateJwt())
          .expect(expectRes.notFound('No user was found with ID foo.'));
      });

      it('should prevent a user from retrieving another user', function() {
        return userFixtures.user().then(function(anotherUser) {
          return spec
            .testApi('GET', '/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + anotherUser.generateJwt())
            .expect(expectRes.notFound('No user was found with ID ' + data.user.get('api_id') + '.'));
        });
      });

      it('should prevent an anonymous user from retrieving a user', function() {
        return spec
          .testApi('GET', '/users/' + data.user.get('api_id'))
          .expect(expectRes.unauthorized('Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'));
      });
    });
  });

  describe('PATCH /api/users/:id', function() {

    function getExpectedPatchedUser(changes) {
      return getExpectedExistingUser(_.extend({
        updatedBefore: null,
        updatedAfter: data.now
      }, changes));
    }

    describe('with an existing user', function() {

      beforeEach(function() {
        return spec.setUp(data, () => {
          addExistingUserData(data);
        });
      });

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

        return userFixtures.admin().then(function(admin) {
          return spec
            .testUpdate('/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + admin.generateJwt())
            .send(body)
            .then(expectUser.inBody(getExpectedPatchedUser(body)));
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
            .expect(expectRes.notFound('No user was found with ID ' + data.user.get('api_id') + '.'));
        });
      });

      const changes = [
        { property: 'active', value: false, errorDescription: 'the status of a user' },
        { property: 'email', value: 'bar@example.com', errorDescription: 'the e-mail of a user' },
        { property: 'role', value: 'admin', errorDescription: 'the role of a user' }
      ];

      _.each(changes, function(change) {
        it('should prevent a user from modifying the `' + change.property + '` property', function() {

          const body = {};
          body[change.property] = change.value;

          return spec
            .testApi('PATCH', '/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + data.user.generateJwt())
            .send(body)
            .then(expectRes.forbidden('You are not authorized to change ' + change.errorDescription + '. Authenticate with a user account that has more privileges.'));
        });
      });
    });
  });
});
