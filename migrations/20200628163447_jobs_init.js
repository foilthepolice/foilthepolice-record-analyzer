
exports.up = async function(knex) {
  await knex.schema
    .createTable('record_job', (table) => {
      table.increments('id').primary();
      table.timestamp('created_at').defaultTo(knex.raw('now()'));
    })
    .createTable('textract_job', (table) => {
      table.increments('id').primary();
      table.integer('record_job_id').references('id').inTable('record_job');
      table.text('aws_job_id').notNullable();
      table.jsonb('data');
      table.timestamp('created_at').defaultTo(knex.raw('now()'));
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('textract_job')
    .dropTable('record_job');
};
