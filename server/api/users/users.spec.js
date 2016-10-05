var app = require('../../app'),
    expect = require('chai').expect,
    expectUser = require('../../spec/expectations/user'),
    spec = require('../../spec/utils'),
    supertest = require('supertest-as-promised');

describe('Users API', function() {
  describe('POST /api/users', function() {

    var data = {};
    beforeEach(function() {
      data.user = {
        email: 'test@example.com',
        password: 'changeme'
      };

      return spec.cleanDatabase();
    });

    it('should create a user', function() {
      return supertest(app)
        .post('/api/users')
        .send(data.user)
        .expect('Content-Type', /^application\/json/)
        .expect(201)
        .then(expectUser.responseChecker(data.user));
    });
  });
});
