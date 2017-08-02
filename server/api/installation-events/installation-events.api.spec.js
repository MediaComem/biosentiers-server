const _ = require('lodash');
const chance = require('chance').Chance();
const expectRes = require('../../spec/expectations/response');
const expectInstallationEvent = require('../../spec/expectations/installation-event');
const geoJsonLength = require('geojson-length');
const installationEventFixtures = require('../../spec/fixtures/installation-event');
const installationFixtures = require('../../spec/fixtures/installation');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');

describe('Installation events API', function() {

  let data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/installations/:id/events', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.oneHourAgo = moment().subtract(1, 'hour');
        data.installation = installationFixtures.installation();

        data.reqBody = {
          type: 'foo.bar',
          version: '1.2.3',
          occurredAt: data.oneHourAgo.toISOString(),
          properties: {
            foo: 'bar',
            baz: [ 'qux', 'corge' ],
            grault: 42
          }
        };
      });
    });

    it('should create an event', function() {

      const expected = _.extend({
        installation: data.installation,
        createdAfter: data.now,
      }, data.reqBody);

      return spec
        .testCreate(`/installations/${data.installation.get('api_id')}/events`, data.reqBody)
        .set('Authorization', `Bearer ${data.installation.generateJwt()}`)
        .then(expectInstallationEvent.inBody(expected));
    });

    it('should create an event with no properties', function() {
      delete data.reqBody.properties;

      const expected = _.extend({
        installation: data.installation,
        properties: {},
        createdAfter: data.now,
      }, data.reqBody);

      return spec
        .testCreate(`/installations/${data.installation.get('api_id')}/events`, data.reqBody)
        .set('Authorization', `Bearer ${data.installation.generateJwt()}`)
        .then(expectInstallationEvent.inBody(expected));
    });

    it('should create multiple events', function() {
      data.reqBody = [
        {
          type: 'foo.bar',
          version: '1.2.3',
          occurredAt: moment().subtract(1, 'hour').toISOString(),
          properties: { foo: 'bar' }
        },
        {
          type: 'bar.baz',
          version: '1.2.3',
          occurredAt: moment().subtract(20, 'minutes').toISOString(),
          properties: { baz: [ 'qux' ] }
        },
        {
          type: 'baz.qux',
          version: '2.0.0',
          occurredAt: moment().subtract(3, 'seconds').toISOString(),
          properties: { corge: 'grault' }
        }
      ];

      function getExpectedEvent(index, changes) {
        return _.extend({}, data.reqBody[index], changes);
      }

      return spec
        .testCreate(`/installations/${data.installation.get('api_id')}/events`, data.reqBody)
        .set('Authorization', `Bearer ${data.installation.generateJwt()}`)
        .then(expectInstallationEvent.listInBody([
          getExpectedEvent(0, {
            installation: data.installation,
            createdAfter: data.now
          }),
          getExpectedEvent(1, {
            installation: data.installation,
            createdAfter: data.now
          }),
          getExpectedEvent(2, {
            installation: data.installation,
            createdAfter: data.now
          })
        ]));
    });

    it('should not accept invalid properties', function() {

      const body = {
        type: '',
        properties: 42,
        occurredAt: 'foo'
      };

      return spec
        .testApi('POST', `/installations/${data.installation.get('api_id')}/events`)
        .set('Authorization', `Bearer ${data.installation.generateJwt()}`)
        .send(body)
        .then(expectRes.invalid([
          {
            message: 'must not be blank',
            type: 'json',
            location: '/type',
            validator: 'notBlank',
            value: '',
            valueSet: true
          },
          {
            message: 'is required',
            type: 'json',
            location: '/version',
            validator: 'required',
            valueSet: false
          },
          {
            message: 'is not a valid ISO-8601 date',
            type: 'json',
            location: '/occurredAt',
            validator: 'iso8601',
            value: 'foo',
            valueSet: true
          },
          {
            message: 'must be of type object',
            type: 'json',
            location: '/properties',
            types: [ 'object' ],
            validator: 'type',
            value: 42,
            valueSet: true
          }
        ]));
    });

    it('should not accept multiple events with invalid properties', function() {
      const tooLongType = chance.string({ length: 256 });
      const tooLongVersion = '2.0.0-beta.3+2017-01-01T00:00:00.000+02:00';

      data.reqBody = [
        {
          type: '  ',
          version: '1.2.3',
          occurredAt: moment().subtract(1, 'hour').toISOString(),
          properties: { foo: 'bar' }
        },
        {
          type: tooLongType,
          occurredAt: moment().subtract(20, 'minutes').toISOString(),
          properties: 42
        },
        {
          type: 'baz.qux',
          version: tooLongVersion,
          occurredAt: 'bar',
          properties: { corge: 'grault' }
        }
      ];

      return spec
        .testApi('POST', `/installations/${data.installation.get('api_id')}/events`)
        .set('Authorization', `Bearer ${data.installation.generateJwt()}`)
        .send(data.reqBody)
        .then(expectRes.invalid([
          {
            message: 'must not be blank',
            type: 'json',
            location: '/0/type',
            validator: 'notBlank',
            value: '  ',
            valueSet: true
          },
          {
            message: `must be a string between 1 and 255 characters long (the supplied string is too long: ${tooLongType.length} characters long)`,
            type: 'json',
            location: '/1/type',
            validator: 'string',
            validation: 'between',
            minLength: 1,
            maxLength: 255,
            actualLength: tooLongType.length,
            cause: 'tooLong',
            value: tooLongType,
            valueSet: true
          },
          {
            message: 'is required',
            type: 'json',
            location: '/1/version',
            validator: 'required',
            valueSet: false
          },
          {
            message: 'must be of type object',
            type: 'json',
            location: '/1/properties',
            types: [ 'object' ],
            validator: 'type',
            value: 42,
            valueSet: true
          },
          {
            message: 'is not a valid ISO-8601 date',
            type: 'json',
            location: '/2/occurredAt',
            validator: 'iso8601',
            value: 'bar',
            valueSet: true
          },
          {
            message: `must be a string between 1 and 25 characters long (the supplied string is too long: ${tooLongVersion.length} characters long)`,
            type: 'json',
            location: '/2/version',
            validator: 'string',
            validation: 'between',
            minLength: 1,
            maxLength: 25,
            actualLength: tooLongVersion.length,
            cause: 'tooLong',
            value: tooLongVersion,
            valueSet: true
          }
        ]));
    });

    it('should prevent an installation from creating an event for another installation', function() {
      return installationFixtures.installation().then(otherInstallation => {
        return spec
          .testApi('POST', `/installations/${data.installation.get('api_id')}/events`)
          .set('Authorization', `Bearer ${otherInstallation.generateJwt()}`)
          .send(data.reqBody)
          .then(expectRes.forbidden('You are not authorized to access this resource. Authenticate with a user account that has more privileges.'));
      });
    });
  });

  describe('with an existing event', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.admin = userFixtures.admin();
        data.twoDaysAgo = moment().subtract(2, 'days');
        data.threeDaysAgo = moment().subtract(3, 'days');
        data.installation = installationFixtures.installation();

        data.eventProps = data.installation.then(installation => {
          return {
            type: 'foo.bar',
            version: '1.2.3',
            installation: installation,
            properties: {
              baz: 'qux'
            },
            occurredAt: data.twoDaysAgo.toDate(),
            createdAt: data.threeDaysAgo.toDate()
          };
        });

        data.event = data.eventProps.then(props => installationEventFixtures.event(props));
      });
    });

    function getExpectedEvent(changes) {
      return _.extend({
        id: data.event.get('api_id')
      }, data.eventProps, changes);
    }

    describe('GET /api/installation-events/:id', function() {
      it('should retrieve an event', function() {
        return spec
          .testRetrieve(`/installation-events/${data.event.get('api_id')}`)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectInstallationEvent.inBody(getExpectedEvent()));
      });

      it('should allow an installation to retrieve one of its events', function() {
        return spec
          .testRetrieve(`/installation-events/${data.event.get('api_id')}`)
          .set('Authorization', `Bearer ${data.installation.generateJwt()}`)
          .then(expectInstallationEvent.inBody(getExpectedEvent()));
      });

      it('should prevent an installation from retrieving an event from another installation', function() {
        return installationFixtures.installation().then(otherInstallation => {
          return spec
            .testApi('GET', `/installation-events/${data.event.get('api_id')}`)
            .set('Authorization', `Bearer ${otherInstallation.generateJwt()}`)
            .then(expectRes.notFound(`No installation event was found with ID ${data.event.get('api_id')}.`));
        });
      });
    });
  });

  describe('with multiple existing events', function() {
    beforeEach(function() {
      return spec.setUp(data, () => {
        data.admin = userFixtures.admin();

        data.installations = [
          installationFixtures.installation({ createdAt: data.threeDaysAgo }),
          installationFixtures.installation({ createdAt: data.threeDaysAgo })
        ];

        data.events = Promise.all(data.installations).then(installations => Promise.all([
          installationEventFixtures.event({
            type: 'foo',
            version: '1.2.3',
            installation: installations[0],
            properties: { foo: 'bar' },
            occurredAt: moment().subtract(3, 'days').toDate(),
            createdAt: moment().subtract(2, 'days').toDate()
          }),
          installationEventFixtures.event({
            type: 'bar',
            version: '1.2.3',
            installation: installations[1],
            properties: { bar: 'baz' },
            occurredAt: moment().subtract(4, 'days').toDate(),
            createdAt: moment().subtract(3, 'days').toDate()
          }),
          installationEventFixtures.event({
            type: 'qux',
            version: '1.3.0',
            installation: installations[0],
            properties: { baz: 'qux' },
            occurredAt: moment().subtract(2, 'days').toDate(),
            createdAt: moment().subtract(44, 'hours').toDate()
          }),
          installationEventFixtures.event({
            type: 'baz',
            version: '1.3.1',
            installation: installations[0],
            properties: { qux: 'corge' },
            occurredAt: moment().subtract(5, 'hours').toDate(),
            createdAt: moment().subtract(3, 'hours').toDate()
          }),
          installationEventFixtures.event({
            type: 'corge',
            version: '2.0.0',
            installation: installations[1],
            properties: { corge: 'grault' },
            occurredAt: moment().subtract(5, 'minutes').toDate(),
            createdAt: moment().subtract(2, 'minutes').toDate()
          })
        ]));
      });
    });

    function getExpectedEvent(index, changes) {
      const event = data.events[index];
      return _.extend({
        id: event.get('api_id'),
        type: event.get('type'),
        version: event.get('version'),
        installation: data.installations.find(installation => installation.get('id') === event.get('installation_id')),
        properties: event.get('properties'),
        createdAt: event.get('created_at'),
        occurredAt: event.get('occurred_at')
      }, changes);
    }

    describe('GET /api/installation-events', function() {
      it('should retrieve events by descending occurrence date', function() {
        return spec
          .testRetrieve('/installation-events')
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectInstallationEvent.listInBody([
            getExpectedEvent(4),
            getExpectedEvent(3),
            getExpectedEvent(2),
            getExpectedEvent(0),
            getExpectedEvent(1)
          ]));
      });

      it('should prevent an installation from listing all events', function() {
        return spec
          .testApi('GET', '/installation-events')
          .set('Authorization', `Bearer ${data.installations[0].generateJwt()}`)
          .expect(expectRes.unauthorized('The Bearer token supplied in the Authorization header is invalid or has expired.'));
      });
    });

    describe('GET /api/installation/:id/events', function() {
      it('should retrieve the installation\'s events by descending occurrence date', function() {
        return spec
          .testRetrieve(`/installations/${data.installations[0].get('api_id')}/events`)
          .set('Authorization', `Bearer ${data.admin.generateJwt()}`)
          .then(expectInstallationEvent.listInBody([
            getExpectedEvent(3),
            getExpectedEvent(2),
            getExpectedEvent(0)
          ]));
      });

      it('should allow an installation to retrieve its events', function() {
        return spec
          .testRetrieve(`/installations/${data.installations[1].get('api_id')}/events`)
          .set('Authorization', `Bearer ${data.installations[1].generateJwt()}`)
          .then(expectInstallationEvent.listInBody([
            getExpectedEvent(4),
            getExpectedEvent(1)
          ]));
      });

      it('should prevent an installation from retrieving another installation\'s events', function() {
        return spec
          .testApi('GET', `/installations/${data.installations[0].get('api_id')}/events`)
          .set('Authorization', `Bearer ${data.installations[1].generateJwt()}`)
          .expect(expectRes.forbidden('You are not authorized to access this resource. Authenticate with a user account that has more privileges.'));
      });
    });
  });
});
