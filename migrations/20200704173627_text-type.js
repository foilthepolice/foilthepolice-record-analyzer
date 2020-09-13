
exports.up = async function(knex) {
  await knex.schema
    .alterTable('record_job', (table) => {
      table.string('type');
    })
    .alterTable('textract_job', (table) => {
      table.string('type');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('record_job', (table) => {
      table.dropColumn('type');
    })
    .alterTable('textract_job', (table) => {
      table.dropColumn('type');
    });
};
