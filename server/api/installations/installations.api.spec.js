const _ = require('lodash');
const expectRes = require('../../spec/expectations/response');
const expectInstallation = require('../../spec/expectations/installation');
const geoJsonLength = require('geojson-length');
const installationFixtures = require('../../spec/fixtures/installation');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');

describe('Installations API', function() {

  let data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/installations', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.admin = userFixtures.admin();

        data.reqBody = {
          properties: {
            foo: 'bar'
          }
        };
      });
    });

    it('should create an installation', function() {

      const expected = _.extend({
        sharedSecret: true,
        createdAfter: data.now,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/installations', data.reqBody)
        .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
        .then(expectInstallation.inBody(expected));
    });

    it('should create an installation with a custom ID', function() {

      data.reqBody.id = installationFixtures.id();

      const expected = _.extend({
        sharedSecret: true,
        createdAfter: data.now,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/installations', data.reqBody)
        .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
        .then(expectInstallation.inBody(expected));
    });

    it('should create an installation with no properties', function() {
      delete data.reqBody.properties;

      const expected = _.extend({
        properties: {},
        sharedSecret: true,
        createdAfter: data.now,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/installations', data.reqBody)
        .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
        .then(expectInstallation.inBody(expected));
    });

    it('should not accept invalid properties', function() {

      const body = {
        id: ' ',
        properties: []
      };

      return spec
        .testApi('POST', '/installations')
        .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
        .send(body)
        .then(expectRes.invalid([
          {
            message: 'must not be blank',
            type: 'json',
            location: '/id',
            validator: 'notBlank',
            value: ' ',
            valueSet: true
          },
          {
            message: 'must be of type object',
            type: 'json',
            location: '/properties',
            types: [ 'object' ],
            validator: 'type',
            value: [],
            valueSet: true
          }
        ]));
    });
  });

  describe('with an existing installation', function() {

    beforeEach(function() {
      return spec.setUp(data, () => {
        data.admin = userFixtures.admin();
        data.threeDaysAgo = moment().subtract(3, 'days');

        data.installationProps = {
          properties: {
            foo: 'bar',
            baz: 'qux'
          },
          createdAt: data.threeDaysAgo.toDate()
        };

        data.installation = installationFixtures.installation(data.installationProps);
      });
    });

    function getExpectedInstallation(changes) {
      return _.extend({
        id: data.installation.get('api_id'),
        updatedAt: data.threeDaysAgo.toDate()
      }, data.installationProps, changes);
    }

    describe('POST /api/installations', function() {
      it('should not accept an existing ID', function() {

        const body = {
          id: data.installation.get('api_id'),
          properties: {
            foo: 'bar'
          }
        };

        return spec
          .testApi('POST', '/installations')
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .send(body)
          .then(expectRes.invalid([
            {
              message: 'is already taken',
              type: 'json',
              location: '/id',
              validator: 'installation.idAvailable',
              value: body.id,
              valueSet: true
            }
          ]));
      });
    });

    describe('GET /api/installations/:id', function() {
      it('should retrieve an installation', function() {
        return spec
          .testRetrieve(`/installations/${data.installation.get('api_id')}`)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectInstallation.inBody(getExpectedInstallation()));
      });
    });

    describe('PATCH /api/installations/:id', function() {
      it('should update an installation', function() {

        const body = {
          properties: {
            baz: null,
            corge: [ 'grault', 'waldo' ]
          }
        };

        const expected = getExpectedInstallation(_.extend({}, body, {
          properties: {
            foo: 'bar',
            corge: [ 'grault', 'waldo' ]
          },
          updatedAt: undefined,
          updatedAfter: data.now
        }));

        return spec
          .testUpdate(`/installations/${data.installation.get('api_id')}`)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .send(body)
          .then(expectInstallation.inBody(expected));
      });

      it('should not accept invalid properties', function() {

        const body = {
          properties: 4
        };

        return spec
          .testApi('PATCH', `/installations/${data.installation.get('api_id')}`)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .send(body)
          .then(expectRes.invalid([
            {
              message: 'must be of type object',
              type: 'json',
              location: '/properties',
              types: [ 'object' ],
              validator: 'type',
              value: 4,
              valueSet: true
            }
          ]));
      });
    });
  });

  describe('with multiple existing installations', function() {

    beforeEach(function() {
      return spec.setUp(data, () => {
        data.admin = userFixtures.admin();

        data.threeDaysAgo = moment().subtract(3, 'days');
        data.twoDaysAgo = moment().subtract(2, 'days');
        data.oneDayAgo = moment().subtract(1, 'day');

        data.installations = [
          installationFixtures.installation({ createdAt: data.threeDaysAgo.toDate(), properties: { foo: 'bar' } }),
          installationFixtures.installation({ createdAt: data.twoDaysAgo.toDate(), properties: { baz: 'qux' } }),
          installationFixtures.installation({ createdAt: data.oneDayAgo.toDate(), properties: { corge: [ 'grault', 'garply' ] } })
        ];
      });
    });

    describe('GET /api/installations', function() {
      it('should retrieve installations by descending creation date', function() {
        return spec
          .testRetrieve('/installations')
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectInstallation.listInBody([
            {
              properties: {
                corge: [ 'grault', 'garply' ]
              },
              createdAt: data.oneDayAgo,
              updatedAt: data.oneDayAgo,
            },
            {
              properties: {
                baz: 'qux'
              },
              createdAt: data.twoDaysAgo,
              updatedAt: data.twoDaysAgo,
            },
            {
              properties: {
                foo: 'bar'
              },
              createdAt: data.threeDaysAgo,
              updatedAt: data.threeDaysAgo,
            }
          ]));
      });
    });
  });
});
