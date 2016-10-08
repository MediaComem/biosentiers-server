var _ = require('lodash'),
    expectRes = require('../../spec/expectations/response'),
    expectUser = require('../../spec/expectations/user'),
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
        email: 'test@example.com'
      };

      return spec.setUp(data);
    });

    it('should create a user', function() {

      var expected = _.extend({
        password: null,
        active: false,
        role: 'user',
        createdAfter: data.now,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/users', data.reqBody)
        .then(expectUser.inBody(expected));
    });
  });

  describe('existing user', function() {
    beforeEach(function() {
      data.threeDaysAgo = moment().subtract(3, 'days');

      data.userProps = {
        email: 'test@example.com',
        password: 'changeme',
        active: true,
        role: 'user',
        createdAt: data.threeDaysAgo
      };

      data.user = userFixtures.user(data.userProps);

      return spec.setUp(data);
    });

    function getExpected(changes) {
      return _.extend({
        id: data.user.get('api_id'),
        updatedBefore: data.now
      }, data.userProps, changes);
    }

    describe('GET /api/users/:id', function() {
      it('should retrieve a user', function() {
        return spec
          .testRetrieve('/users/' + data.user.get('api_id'))
          .set('Authorization', 'Bearer ' + data.user.jwt())
          .then(expectUser.inBody(getExpected()));
      });

      it('should allow an admin to retrieve another user', function() {
        return userFixtures.admin().then(function(admin) {
          return spec
            .testRetrieve('/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + admin.jwt())
            .then(expectUser.inBody(getExpected()));
        });
      });

      it('should not retrieve a non-existent user', function() {
        return spec
          .testApi('GET', '/users/foo')
          .set('Authorization', 'Bearer ' + data.user.jwt())
          .expect(expectRes.notFound('No user was found with ID foo.'));
      });

      it('should prevent a user from retrieving another user', function() {
        return userFixtures.user().then(function(anotherUser) {
          return spec
            .testApi('GET', '/users/' + data.user.get('api_id'))
            .set('Authorization', 'Bearer ' + anotherUser.jwt())
            .expect(expectRes.notFound('No user was found with ID ' + data.user.get('api_id') + '.'));
        });
      });

      it('should prevent an anonymous user from retrieving a user', function() {
        return spec
          .testApi('GET', '/users/' + data.user.get('api_id'))
          .expect(expectRes.unauthorized('Authentication is required to access this resource. Authenticate by providing a Bearer token in the Authorization header.'));
      });
    });

    describe('PATCH /api/users/:id', function() {
      function getExpectedPatched(changes) {
        return getExpected(_.extend({
          updatedBefore: null,
          updatedAfter: data.now
        }, changes));
      }

      it('should update a user', function() {

        var changes = {
          password: 'letmein'
        };

        return spec
          .testUpdate('/users/' + data.user.get('api_id'))
          .set('Authorization', 'Bearer ' + data.user.jwt())
          .send(changes)
          .then(expectUser.inBody(getExpectedPatched(changes)));
      });
    });
  });
});
