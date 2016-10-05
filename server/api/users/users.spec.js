var app = require('../../app'),
    expect = require('chai').expect,
    spec = require('../../spec/utils'),
    supertest = require('supertest-as-promised');

describe('Users API', function() {
  describe('POST /api/users', function() {

    beforeEach(function(done) {
      spec.cleanDatabase().then(done);
    });

    it('should create a user', function(done) {
      supertest(app)
        .post('/api/users')
        .send({
          email: 'test@example.com',
          password: 'changeme'
        })
        .expect('Content-Type', /^application\/json/)
        .expect(201)
        .end(done);
    });
  });
});
