const _ = require('lodash');
const fetcher = require('../fetcher');
const Installation = require('../../models/installation');
const installationValidations = require('./installations.validations');
const np = require('../../lib/native-promisify');
const policy = require('./installations.policy');
const QueryBuilder = require('../query-builder');
const route = require('../route');
const serialize = require('../serialize');
const validate = require('../validate');
const validations = require('../lib/validations');

// API resource name (used in some API errors)
exports.resourceName = 'installation';

exports.create = route.transactional(async function(req, res) {
  await np(validateInstallation(req));
  const installation = policy.parse(req);
  await installation.save();
  res.status(201).send(await serialize(req, installation, policy, { sharedSecret: true }));
});

exports.list = route(async function(req, res) {

  const installations = await new QueryBuilder(req, res, policy.scope(req))
    .filter(search)
    .paginate()
    .sorts('createdAt', 'updatedAt', 'firstStartedAt')
    .defaultSort('createdAt', 'desc')
    .fetch();

  res.send(await serialize(req, installations, policy));
});

exports.retrieve = route(async function(req, res) {
  res.send(await serialize(req, req.installation, policy));
});

exports.update = route.transactional(async function(req, res) {
  await np(validateInstallation(req, true));
  policy.parse(req, req.installation);
  await req.installation.save();
  res.send(await serialize(req, req.installation, policy));
});

exports.fetchInstallation = fetcher({
  model: Installation,
  resourceName: exports.resourceName
});

function validateInstallation(req, patchMode) {
  return validate.requestBody(req, function() {
    return this.parallel(
      this.if(!patchMode, this.validate(
        this.json('/id'),
        this.while(this.isSet()),
        this.type('string'),
        this.notBlank(),
        this.string(1, 36),
        installationValidations.idAvailable()
      )),
      this.validate(
        this.json('/properties'),
        this.while(this.isSet()),
        this.type('object')
      ),
      this.validate(
        this.json('/firstStartedAt'),
        this.while(!patchMode),
        this.required(),
        this.type('string'),
        validations.iso8601()
      )
    );
  });
}

function search(query, req) {
  if (!_.isString(req.query.search)) {
    return query;
  }

  const term = `%${req.query.search.toLowerCase()}%`;
  const clauses = _.map([ 'api_id' ], attr => `LOWER(installation.${attr}) LIKE ?`);

  return query.query(qb => qb.whereRaw(`(${clauses.join(' OR ')})`, Array(clauses.length).fill(term)));
}
