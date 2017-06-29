const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(
    knex,
    addParticipantsCountColumn,
    setParticipantsCounts,
    addParticipantsCountColumnConstraints
  );
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return dropParticipantsCountColumn(knex);
};

function addParticipantsCountColumn(knex) {
  return knex.schema.alterTable('excursion', (t) => {
    t.specificType('participants_count', 'smallint').defaultTo(0);
  });
}

function setParticipantsCounts(knex) {
  return knex.raw(PARTICIPANTS_COUNT_QUERY).then(results => {
    if (!results.rows.length) {
      return;
    }

    return Promise.all(results.rows.map(row => {
      return knex('excursion')
        .update({ participants_count: row.participants_count })
        .where('id', row.id);
    }));
  });
}

function addParticipantsCountColumnConstraints(knex) {
  return knex.schema.alterTable('excursion', (t) => {
    t.specificType('participants_count', 'smallint').notNullable().defaultTo(0).alter();
  });
}

function dropParticipantsCountColumn(knex) {
  return knex.schema.alterTable('excursion', (t) => {
    t.dropColumn('participants_count');
  });
}

const PARTICIPANTS_COUNT_QUERY = `
SELECT
  excursion.id,
  count(participant.id) AS participants_count
FROM
  excursion
  INNER JOIN participant ON (excursion.id = participant.excursion_id)
GROUP BY
  excursion.id
;
`.replace(/\s+/g, ' ').trim();
