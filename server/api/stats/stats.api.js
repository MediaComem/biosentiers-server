const _ = require('lodash');
const BPromise = require('bluebird');
const db = require('../../db');
const moment = require('moment');
const policy = require('./stats.policy');
const route = require('../route');
const serialize = require('../serialize');

// See PostgreSQL date type formatting functions:
// https://www.postgresql.org/docs/9.6/static/functions-formatting.html
const ACTIVITY = {
  intervals: {
    hour: {
      defaultCount: 24,
      momentUnit: 'hour'
    },
    day: {
      defaultCount: 30,
      momentUnit: 'day'
    },
    week: {
      defaultCount: 26,
      momentUnit: 'isoWeek'
    },
    month: {
      defaultCount: 24,
      momentUnit: 'month'
    }
  },
  subjects: {
    excursions: {
      table: 'excursion',
      column: 'planned_at'
    },
    installations: {
      table: 'installation',
      column: 'first_started_at'
    },
    installationEvents: {
      table: 'installation_event',
      column: 'occurred_at'
    },
    users: {
      table: 'user_account',
      column: 'created_at'
    }
  }
};

exports.retrieve = route(async function(req, res) {

  const tables = await listTables();

  const data = await BPromise.props({
    counts: getAllCounts(tables),
    sizes: getAllSizes(tables)
  });

  const stats = {
    database: {
      size: data.sizes.database,
      tables: tables.reduce((memo, table) => {

        memo[table] = _.extend(data.sizes.tables[table], {
          rows: data.counts[table]
        });

        return memo;
      }, {})
    }
  };

  res.send(await serialize(req, stats, policy));
});

exports.retrieveActivity = route(async function(req, res) {

  let subject = req.query.subject;
  if (!(subject in ACTIVITY.subjects)) {
    subject = 'installationEvents';
  }

  const table = ACTIVITY.subjects[subject].table;
  const column = ACTIVITY.subjects[subject].column;

  let interval = req.query.interval;
  if (!(interval in ACTIVITY.intervals)) {
    interval = 'day';
  }

  const momentUnit = ACTIVITY.intervals[interval].momentUnit;

  let dateFormat = ACTIVITY.intervals[interval].format;

  const truncatedDate = `date_trunc('${interval}', ${column})`;

  let query = db.knex
    .select(db.knex.raw(`${truncatedDate} AS counted_at`), db.knex.raw('count(id) AS count'))
    .from(table)
    .groupByRaw(truncatedDate)
    .orderByRaw(`${truncatedDate} DESC`)
    .limit(100);

  let startedAt;
  if (req.query.startedAt) {
    const startedAtMoment = moment(req.query.startedAt, moment.ISO_8601);
    if (startedAtMoment.isValid()) {
      startedAt = startedAtMoment.startOf(momentUnit).toDate();
    }
  } else {
    // For example: subtract 24 hours if the interval is "hour" (see ACTIVITY configuration)
    startedAt = moment().utc().startOf(momentUnit).subtract(ACTIVITY.intervals[interval].defaultCount - 1, interval).toDate();
  }

  if (startedAt) {
    query = query.where(column, '>=', startedAt);
  }

  let endedAt;
  if (req.query.endedAt) {
    const endedAtMoment = moment(req.query.endedAt, moment.ISO_8601);
    if (endedAtMoment.isValid()) {
      endedAt = endedAtMoment.startOf(momentUnit).toDate();
    }
  } else {
    endedAt = moment().utc().endOf(momentUnit).subtract(1, 'millisecond').toDate();
  }

  if (endedAt) {
    query = query.where(column, '<=', endedAt);
  }

  const values = await query;
  values.forEach(value => {

    value.count = parseInt(value.count, 10);

    /*
     * "Fix" the date.
     *
     * The columns used for the aggregation are timestamps without timezone.
     *
     * When using `date_trunc('day', column)`, PostgreSQL returns "2017-01-02 00:00:00" as the time.
     * This time is fed to `new Date()` by the `pg` driver before knex returns it. It's interpreted
     * in the current timezone and we therefore get the "wrong" time ("2017-01-02T22:00:00Z" or
     * "2017-01-02T00:00:00+02:00" in the CEST timezone).
     *
     * Add the current UTC offset to fix the date.
     */
    value.counted_at = moment(value.counted_at).add(moment().utcOffset(), 'minutes').toDate();
  });

  const allValues = [];

  let date = moment.utc(startedAt);
  while (date.isBefore(endedAt)) {

    const existingValue = values.find(value => date.isSame(moment(value.counted_at)));
    if (existingValue) {
      allValues.push(existingValue);
    } else {
      allValues.push({
        count: 0,
        counted_at: date.toDate()
      });
    }

    date = date.add(1, interval);
  }

  const activity = {
    interval: interval,
    startedAt: startedAt,
    endedAt: endedAt,
    values: allValues.reverse()
  };

  res.send(policy.serializeActivity(req, activity));
});

async function getAllCounts(tables) {
  return BPromise.props(tables.reduce((memo,table) => {
    memo[table] = db.knex.count().from(table).then(rows => parseInt(rows[0].count, 10));
    return memo;
  }, {}));
}

async function getAllSizes(tables) {

  const knex = db.knex;

  let query = knex.select(knex.raw('pg_database_size(current_database()) AS database_size'));
  tables.forEach(table => {
    query = query.select(
      knex.raw(`pg_relation_size('${table}') AS table_${table}_size`),
      knex.raw(`pg_total_relation_size('${table}') AS table_${table}_total_size`)
    );
  });

  return query.then(rows => rows[0]).then(sizes => {
    return {
      database: parseInt(sizes.database_size, 10),
      tables: tables.reduce((memo, table) => {

        memo[table] = {
          size: parseInt(sizes[`table_${table}_size`], 10),
          totalSize: parseInt(sizes[`table_${table}_total_size`], 10)
        };

        return memo;
      }, {})
    };
  });
}

async function listTables() {
  return db
    .knex
    .select('table_name')
    .from('information_schema.tables')
    .where('table_type', 'BASE TABLE')
    .where('table_schema', 'NOT IN', [ 'pg_catalog', 'information_schema' ])
    .then(rows => rows.map(row => row.table_name));
}
