const _ = require('lodash');
const expectRes = require('../../spec/expectations/response');
const expectInstallationEvent = require('../../spec/expectations/installation-event');
const geoJsonLength = require('geojson-length');
const installationEventFixtures = require('../../spec/fixtures/installation-event');
const installationFixtures = require('../../spec/fixtures/installation');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const userFixtures = require('../../spec/fixtures/user');

describe.only('Installation events API', function() {

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
        .then(expectInstallationEvent.inBody(expected));
    });

    it('should not accept invalid properties', function() {

      const body = {
        type: '',
        properties: 42
      };

      return spec
        .testApi('POST', `/installations/${data.installation.get('api_id')}/events`)
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
            location: '/occurredAt',
            validator: 'required',
            valueSet: false
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
            installation: installations[0],
            properties: { foo: 'bar' },
            occurredAt: moment().subtract(3, 'days').toDate(),
            createdAt: moment().subtract(2, 'days').toDate()
          }),
          installationEventFixtures.event({
            type: 'bar',
            installation: installations[1],
            properties: { bar: 'baz' },
            occurredAt: moment().subtract(4, 'days').toDate(),
            createdAt: moment().subtract(3, 'days').toDate()
          }),
          installationEventFixtures.event({
            type: 'qux',
            installation: installations[0],
            properties: { baz: 'qux' },
            occurredAt: moment().subtract(2, 'days').toDate(),
            createdAt: moment().subtract(44, 'hours').toDate()
          }),
          installationEventFixtures.event({
            type: 'baz',
            installation: installations[0],
            properties: { qux: 'corge' },
            occurredAt: moment().subtract(5, 'hours').toDate(),
            createdAt: moment().subtract(3, 'hours').toDate()
          }),
          installationEventFixtures.event({
            type: 'corge',
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
    });
  });
});
