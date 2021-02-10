#!/usr/bin/env node
const fs = require('fs-extra');
const knex = require('knex');
const _ = require('lodash');
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

  // Extract & save all events.
  const [ installations, events ] = await Promise.all([
    loadInstallations(db),
    loadInstallationEvents(db)
  ]);

  await fs.mkdirs(dataDir);

  await Promise.all([
    saveReadme(),
    // Extract raw data.
    saveData('all-installations.json', installations),
    saveData('all-events.json', events),
    // Extract non-location events.
    saveData('other-events.json', events.filter(event => event.type !== 'location')),
    // Extract location events as GeoJSON.
    saveData('location-events.geojson', eventsToGeoJsonFeatureCollection(events.filter(event => event.type === 'location')))
  ]);
}

function loadInstallations(db) {
  return db('installation').select('id', 'api_id', 'properties', 'created_at', 'updated_at', 'first_started_at', 'last_event_at', 'events_count').orderBy('created_at', 'id');
}

function loadInstallationEvents(db) {
  return db('installation_event').select().whereNot('type', 'test').orderBy('occurred_at', 'created_at', 'id');
}

async function saveData(basename, data, directory = dataDir) {
  const file = path.join(directory, basename);
  await fs.writeFile(file, JSON.stringify(data, undefined, 2), 'utf8');
  console.log(`Saved ${basename} to ${path.relative(config.root, directory)}`);
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
