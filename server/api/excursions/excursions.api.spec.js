const _ = require('lodash');
const BPromise = require('bluebird');
const expectExcursion = require('../../spec/expectations/excursion');
const jwt = require('../../lib/jwt');
const moment = require('moment');
const spec = require('../../spec/utils');
const themeFixtures = require('../../spec/fixtures/theme');
const trailFixtures = require('../../spec/fixtures/trail');
const userFixtures = require('../../spec/fixtures/user');
const zoneFixtures = require('../../spec/fixtures/zone');

describe('Excursions API', function() {

  let data;
  beforeEach(function() {
    data = {};
  });

  describe('POST /api/excursions', function() {
    beforeEach(function() {
      return spec.setUp(data, function() {
        data.user = userFixtures.user();
        data.trail = trailFixtures.trail();

        data.themes = BPromise.all([
          themeFixtures.theme(),
          themeFixtures.theme()
        ]);

        data.zones = data.trail.then((trail) => {
          return Promise.all([
            zoneFixtures.zone({ trail: trail, position: 1 }),
            zoneFixtures.zone({ trail: trail, position: 2 })
          ]);
        });

        data.reqBody = {
          trailHref: data.trail.get('href'),
          themes: [ data.themes.get(0).call('get', 'name') ],
          zoneHrefs: [ data.zones.then(zones => `/api/zones/${zones[1].get('api_id')}`) ],
          plannedAt: moment().add(2, 'days').toDate()
        };
      });
    });

    it('should create an excursion', function() {

      const expected = _.extend({
        creatorId: data.user.get('api_id'),
        createdJustAfter: data.afterSetup,
        updatedAt: 'createdAt'
      }, data.reqBody);

      return spec
        .testCreate('/excursions', data.reqBody)
        .set('Authorization', 'Bearer ' + data.user.generateJwt())
        .then(expectExcursion.inBody(expected));
    });
  });
});
