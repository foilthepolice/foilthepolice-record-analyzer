const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// AWS
const getAwsRegion = () => process.env.AWS_REGION;
const getAwsS3Bucket = () => process.env.AWS_S3_BUCKET;
const getAwsAccessKeyId = () => process.env.AWS_ACCESS_KEY_ID;
const getAwsSecretAccessKey = () => process.env.AWS_SECRET_ACCESS_KEY;

// Database
const getDatabaseHost = () => process.env.DATABASE_HOST;
const getDatabaseUser = () => process.env.DATABASE_USER;
const getDatabaseUserPassword = () => process.env.DATABASE_USER_PASSWORD;
const getDatabaseName = () => process.env.DATABASE_NAME;
const getDatabaseCharset = () => process.env.DATABASE_CHARSET;

// Server
const getPort = () => process.env.PORT;

module.exports = {
  getAwsRegion,
  getAwsS3Bucket,
  getAwsAccessKeyId,
  getAwsSecretAccessKey,
  getDatabaseHost,
  getDatabaseUser,
  getDatabaseUserPassword,
  getDatabaseName,
  getDatabaseCharset,
  getPort,
};
