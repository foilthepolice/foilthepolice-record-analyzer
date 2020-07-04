
exports.up = async function(knex) {
  await knex.schema
    .alterTable('textract_job', (table) => {
      table.text('file_bucket');
      table.text('file_key');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('textract_job', (table) => {
      table.dropColumn('file_bucket');
      table.dropColumn('file_key');
    });
};
