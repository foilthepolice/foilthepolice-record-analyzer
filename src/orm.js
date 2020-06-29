const Knex = require('knex');
const { knexSnakeCaseMappers } = require('objection');
const Env = require('./env');

const knexConfig = {
  client: 'pg',
  connection: {
    host: Env.getDatabaseHost(),
    user: Env.getDatabaseUser(),
    password: Env.getDatabaseUserPassword(),
    database: Env.getDatabaseName(),
    charset: Env.getDatabaseCharset(),
  },
  pool: undefined,
};

const knex = Knex({ ...knexConfig, ...knexSnakeCaseMappers() });

module.exports = {
  knex,
};
