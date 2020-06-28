const AWS = require('aws-sdk');
const Env = require('./env');

const s3 = new AWS.S3({
  params: {
    Bucket: Env.getAwsS3Bucket(),
  },
  credentials: {
    accessKeyId: Env.getAwsAccessKeyId(),
    secretAccessKey: Env.getAwsSecretAccessKey(),
  },
});

const textract = new AWS.Textract({
  region: 'us-east-1',
  credentials: {
    accessKeyId: Env.getAwsAccessKeyId(),
    secretAccessKey: Env.getAwsSecretAccessKey(),
  },
});

module.exports = {
  s3,
  textract,
};
