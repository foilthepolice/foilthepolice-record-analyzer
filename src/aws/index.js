const AWS = require('aws-sdk');
const dts = require('date-fns');
const uuid = require('uuid').v4;

const Env = require('../env');

const s3 = new AWS.S3({
  params: {
    Bucket: Env.getAwsS3Bucket(),
  },
  credentials: {
    accessKeyId: Env.getAwsAccessKeyId(),
    secretAccessKey: Env.getAwsSecretAccessKey(),
  },
});

const upload = async (name, buffer) => {
  return new Promise((resolve, reject) => {
    s3.upload({
      ACL: 'public-read',
      Body: buffer,
      Expires: dts.addMinutes(new Date(), 15),
      Key: `${uuid()}_${name}`.replace(/\s/, '_'),
    }, (err, upload) => {
      if (err) {
        console.log(new Date(), `upload(): Upload Failed - ${err.message}`);
        return reject(err);
      }
      console.log(new Date(), 'upload(): Upload Success');
      resolve({
        bucket: upload.Bucket,
        expiration: upload.Expiration,
        location: upload.Location,
        key: upload.Key,
      });
    });
  });
}

const textract = new AWS.Textract({
  region: 'us-east-1',
  credentials: {
    accessKeyId: Env.getAwsAccessKeyId(),
    secretAccessKey: Env.getAwsSecretAccessKey(),
  },
});

const startDocumentAnalysis = async (config) => {
  return new Promise((resolve, reject) => {
    textract.startDocumentAnalysis(config, (err, data) => {
      if (err) {
        console.log(new Date(), `startDocumentAnalysis(): Analysis Failed - ${err.message}`)
        return reject(err);
      }
      console.log(new Date(), 'startDocumentAnalysis(): Analysis Started')
      resolve(data.JobId);
    });
  });
}

const getDocumentAnalysis = async (textractJobId) => {
  return new Promise((resolve, reject) => {
    textract.getDocumentAnalysis({ JobId: textractJobId }, (err, data) => {
      if (err) return reject(err);
      // If succeeded, return the key/value parsed data
      if (data.JobStatus === 'SUCCEEDED') {
        console.log(new Date(), 'getDocumentAnalysis(): Done & Data Received')
        resolve(data);
      } else if (data.JobStatus === 'FAILED') {
        console.log(new Date(), 'getDocumentAnalysis(): Failed', data)
        reject(data);
      } else {
        console.log(new Date(), 'getDocumentAnalysis(): In Progress')
        resolve(null);
      }
    });
  });
}

const startDocumentTextDetection = async (config) => {
  return new Promise((resolve, reject) => {
    textract.startDocumentTextDetection(config, (err, data) => {
      if (err) {
        console.log(new Date(), `startDocumentTextDetection(): Text Detection Failed - ${err.message}`)
        return reject(err);
      }
      console.log(new Date(), 'startDocumentTextDetection(): Text Detection Started')
      resolve(data.JobId);
    });
  });
}

// Fetch all chunks split across requests with nextToken
// When no more next token return the data
async function getDocumentTextDetectionChunk(jobId, priorData = { Blocks: [] }, nextToken) {
  return new Promise((resolve, reject) => {
    textract.getDocumentTextDetection({ JobId: jobId, MaxResults: 1000, NextToken: nextToken }, async (err, nextChunk) => {
      if (err) return reject(err);
      const newData = {
        ...nextChunk.data,
        Blocks: [
          ...(priorData.Blocks || []),
          ...nextChunk.Blocks,
        ],
      };
      console.log(new Date(), `getDocumentTextDetectionChunk() ${jobId}`,  (priorData.Blocks || []).length, '>', (newData.Blocks || []).length);
      if (!nextChunk.NextToken) return resolve(newData)
      resolve(getDocumentTextDetectionChunk(
        jobId,
        newData,
        nextChunk.NextToken
      ));
    })
  });
}

const getDocumentTextDetection = async (textractJobId) => {
  return new Promise((resolve, reject) => {
    // Ping just to see if we have results
    textract.getDocumentTextDetection({ JobId: textractJobId, MaxResults: 1 }, async (err, data) => {
      if (err) return reject(err);
      // If succeeded, fetch all data and concat
      if (data.JobStatus === 'SUCCEEDED') {
        console.log(new Date(), 'getDocumentAnalysis(): Done & Data Received')
        const compiled = await getDocumentTextDetectionChunk(textractJobId);
        resolve(compiled);
      } else if (data.JobStatus === 'FAILED') {
        console.log(new Date(), 'getDocumentAnalysis(): Failed', data)
        reject(data);
      } else {
        console.log(new Date(), 'getDocumentAnalysis(): In Progress')
        resolve(null);
      }
    });
  });
}


module.exports = {
  getDocumentAnalysis,
  getDocumentTextDetection,
  s3,
  startDocumentAnalysis,
  startDocumentTextDetection,
  textract,
  upload,
};
