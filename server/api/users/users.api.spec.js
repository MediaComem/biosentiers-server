var _ = require('lodash'),
    expectRes = require('../../spec/expectations/response'),
    expectUser = require('../../spec/expectations/user'),
    jwt = require('../../lib/jwt'),
    moment = require('moment'),
    spec = require('../../spec/utils'),
    userFixtures = require('../../spec/fixtures/user');

describe('Users API', function() {

  var data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/users', function() {
    beforeEach(function() {
      data.reqBody = {
        email: 'test@example.com',
        password: 'letmein'
      };
    });

    describe('for an admin', function() {
      beforeEach(function() {
        data.admin = userFixtures.admin();
        return spec.setUp(data);
      });

      it('should create a user', function() {

        var expected = _.extend({
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

        var body = {
          email: 'foo'
        };

        return spec
          .testApi('POST', '/users')
          .set('Authorization', 'Bearer ' + data.admin.generateJwt())
          .send(body)
          .then(expectRes.invalid([
            {
              code: 'validation.email.invalid',
              type: 'json',
              location: '/email',
              message: 'Value must be a valid e-mail address.'
            },
            {
              code: 'validation.presence.missing',
              type: 'json',
              location: '/password',
              message: 'Value is required.'
            }
          ]));
      });
    });

    describe('for an invited user', function() {
      beforeEach(function() {
        data.invitation = jwt.generateToken({
          authType: 'invitation',
          email: data.reqBody.email,
          role: 'user'
        });

        return spec.setUp(data);
      });

      it('should create a user', function() {

        var expected = _.extend({
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
      email: 'test@example.com',
      password: 'changeme',
      active: true,
      role: 'user',
      createdAt: data.threeDaysAgo
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
        addExistingUserData(data);
        return spec.setUp(data);
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
        addExistingUserData(data);
        return spec.setUp(data);
      });

      it('should update a user', function() {

        var body = {
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

        var body = {
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

        var body = {
          password: '',
          previousPassword: 'foo'
        };

        return spec.testApi('PATCH', '/users/' + data.user.get('api_id'))
          .set('Authorization', 'Bearer ' + data.user.generateJwt())
          .send(body)
          .then(expectRes.invalid([
            {
              code: 'validation.presence.missing',
              type: 'json',
              location: '/password',
              message: 'Value is required.'
            }
          ]));
      });

      it('should prevent a user from updating another user', function() {

        var body = {
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

      var changes = [
        { property: 'active', value: false, errorDescription: 'the status of a user' },
        { property: 'email', value: 'bar@example.com', errorDescription: 'the e-mail of a user' },
        { property: 'role', value: 'admin', errorDescription: 'the role of a user' }
      ];

      _.each(changes, function(change) {
        it('should prevent a user from modifying the `' + change.property + '` property', function() {

          var body = {};
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
