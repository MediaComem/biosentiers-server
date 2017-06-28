const utils = require('../lib/knex-utils');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(knex, () => {
    return knex.schema.alterTable('theme', (t) => {
      t.string('description', 50);
    });
  }, () => {
    return Promise.all([
      knex('theme').update('description', 'Oiseaux').where('name', 'bird'),
      knex('theme').update('description', 'Papillons').where('name', 'butterfly'),
      knex('theme').update('description', 'Fleurs').where('name', 'flower'),
      knex('theme').update('description', 'Arbres').where('name', 'tree')
    ]);
  }, () => {
    return knex.schema.alterTable('theme', (t) => {
      t.string('description', 50).notNullable().alter();
    });
  });
};

exports.down = function(knex, Promise) {
  utils.logMigration(knex);
  return knex.schema.alterTable('theme', (t) => {
    t.dropColumn('description');
  });
};
