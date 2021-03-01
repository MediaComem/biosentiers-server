#!/usr/bin/env node
const fs = require('fs-extra');
const knex = require('knex');
const _ = require('lodash');
const moment = require('moment');
const path = require('path');

const config = require('../config');
const dataDir = path.join(config.root, 'tmp', 'data');

Promise
  .resolve()
  .then(execute)
  .catch(err => {
    console.error(err.stack);
    process.exit(1);
  });

async function execute() {
  const db = await createDatabase();
  await extractData(db);
  await db.destroy();
}

async function createDatabase() {
  const db = knex({
    client: 'postgresql',
    // TODO: support unix socket
    connection: config.db
  });

  const result = await db.raw('select 1+1 as n');
  if (result.rowCount !== 1 || result.rows[0].n !== 2) {
    throw new Error('Could not get expected result from the database');
  }

  return db;
}

async function extractData(db) {

  // Extract all events.
  const [ installations, events ] = await Promise.all([
    loadInstallations(db),
    loadInstallationEvents(db)
  ]);

  await fs.mkdirs(dataDir);

  const locationEvents = events.filter(event => event.type === 'location');

  await Promise.all([
    saveReadme(),
    // Save raw data.
    saveData('all-installations.json', installations),
    saveData('all-events.json', events),
    // Save non-location events.
    saveData('other-events.json', events.filter(event => event.type !== 'location')),
    // Save location events as GeoJSON.
    saveData('location-events.geojson', eventsToGeoJsonFeatureCollection(locationEvents)),
    // Save location event data by day as well.
    saveEventDataGroupedByDayAndInstallation(locationEvents)
  ]);
}

async function loadInstallations(db) {
  const installations = await db('installation').select('api_id', 'properties', 'created_at', 'updated_at', 'first_started_at', 'last_event_at', 'events_count').orderBy('created_at', 'api_id');
  return installations.map(installation => ({
    ..._.omit(installation, 'id', 'api_id'),
    id: installation.api_id
  }));
}

async function loadInstallationEvents(db) {
  const events = await db('installation_event')
    .innerJoin('installation', 'installation_event.installation_id', 'installation.id')
    .select('installation_event.*', 'installation.api_id AS installation_api_id')
    .whereNot('type', 'test')
    .orderBy('occurred_at', 'created_at', 'api_id');

  return events.map(event => ({
    ..._.omit(event, 'id', 'api_id', 'installation_id', 'installation_api_id'),
    id: event.api_id,
    installation_id: event.installation_api_id
  }));
}

async function saveData(basename, data, directory = dataDir) {
  const file = path.join(directory, basename);
  await fs.writeFile(file, JSON.stringify(data, undefined, 2), 'utf8');
  console.log(`Saved ${basename} to ${path.relative(config.root, directory)}`);
}

async function saveEventDataGroupedByDayAndInstallation(events) {
  const eventsByDayAndInstallation = events.reduce(
    (memo, event) => {
      const occurredAt = moment(event.occurred_at, moment.ISO_8601);
      if (!occurredAt.isValid()) {
        throw new Error(`Event occurrence date ${JSON.stringify(event.occured_at)} is not a valid ISO-8601 date`);
      }

      const day = occurredAt.format('YYYY-MM-DD');
      const installation = event.installation_id;
      const key = `${day}---${installation}`;
      memo[key] = memo[key] || [];
      memo[key].push(event);
      return memo;
    },
    {}
  );

  const byDayAndInstallationDir = path.join(dataDir, 'by-day-and-installation');
  await fs.mkdirs(byDayAndInstallationDir);

  await Promise.all(_.reduce(
    eventsByDayAndInstallation,
    (memo, events, key) =>
      [ ...memo, saveData(`${key}.geojson`, eventsToGeoJsonFeatureCollection(events), byDayAndInstallationDir) ],
    []
  ));
}

function eventsToGeoJsonFeatureCollection(events) {
  return {
    type: 'FeatureCollection',
    features: events.map(eventToGeoJsonFeature)
  };
}

function eventToGeoJsonFeature(event) {

  const properties = {
    ..._.omit(event, 'properties'),
    ..._.omit(event.properties, 'position')
  };

  let geometry = null;
  if (event.type === 'location') {
    const position = event.properties.position;
    const longitude = position.longitude;
    const latitude = position.latitude;
    if (!_.isFinite(longitude) || !_.isFinite(latitude)) {
      throw new Error(`Location event ${JSON.stringify(event)} has no longitude or latitude`);
    }

    geometry = {
      type: 'Point',
      coordinates: _.compact([position.longitude, position.latitude, position.altitude])
    };

    if (position.accuracy) {
      properties.position_accuracy = position.accuracy;
    }
  }

  return {
    type: 'Feature',
    geometry,
    properties
  };
}

async function saveReadme() {
  const readmeFile = path.join(dataDir, 'README');
  const contents = `This data was generated with the script ${JSON.stringify(path.relative(config.root, __filename))} in the BioSentiers backend's repository.`;
  await fs.writeFile(readmeFile, contents, 'utf8');
}
