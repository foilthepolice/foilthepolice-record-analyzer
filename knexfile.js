const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbUser = process.env.DATABASE_USER;
const dbPassword = process.env.DATABASE_USER_PASSWORD;
const dbHost = process.env.DATABASE_HOST;
const dbPort = process.env.DATABASE_PORT;
const dbName = process.env.DATABASE_NAME;
const dbConnectionURL = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

// Migration locally cmd: docker-compose run api npx knex "migrate:latest"

module.exports = {
  client: 'pg',
  connection: dbConnectionURL,
  migrations: {
    directory: path.join(__dirname, '/migrations'),
  },
};
