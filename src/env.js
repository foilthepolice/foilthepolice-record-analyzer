const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const getAwsRegion = () => process.env.AWS_REGION;
const getAwsS3Bucket = () => process.env.AWS_S3_BUCKET;
const getAwsAccessKeyId = () => process.env.AWS_ACCESS_KEY_ID;
const getAwsSecretAccessKey = () => process.env.AWS_SECRET_ACCESS_KEY;
const getPort = () => process.env.PORT;

module.exports = {
  getAwsRegion,
  getAwsS3Bucket,
  getAwsAccessKeyId,
  getAwsSecretAccessKey,
  getPort,
};