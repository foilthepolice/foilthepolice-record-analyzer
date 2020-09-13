const schedule = require('node-schedule');
const { knex } = require('../orm');
const {
  getDocumentAnalysis,
  getDocumentTextDetection,
  startDocumentAnalysis,
  startDocumentTextDetection
} = require('../aws');
const TEXTRACT_TYPES = require('./textractTypes');

// Textract Form - Analysis Start
schedule.scheduleJob('*/15 * * * * *', async (dateTime) => {
  console.log(dateTime, 'Textract Analysis: Running');
  // Get a job to analyze
  const textractJob = await knex('textract_job')
    .where('type', TEXTRACT_TYPES.FORM)
    .whereNull('textractJobId')
    .whereNotNull('fileBucket')
    .whereNotNull('fileKey')
    .first();
  if (textractJob) {
    console.log(dateTime, `Textract Analysis: Job #${textractJob.id}`);
  } else {
    return console.log(dateTime, 'Textract Analysis: No job to run.');
  }
  // Start Textract Analysis
  const textractJobId = await startDocumentAnalysis({
    DocumentLocation: {
      S3Object: {
        Bucket: textractJob.fileBucket,
        Name: textractJob.fileKey,
      },
    },
    FeatureTypes: ['FORMS'],
  });
  // Create textract db record related to our record for querying later
  await knex('textract_job')
    .where('id', textractJob.id)
    .update({ textractJobId });
  console.log(dateTime, `Textract Analysis: Finished: #${textractJob.id}`);
});

// Textract Form - Fetch & Save
schedule.scheduleJob('*/15 * * * * *', async (dateTime) => {
  console.log(dateTime, 'Textract Analysis Fetch: Running');
  // Get a job to fetcch
  const textractJob = await knex('textract_job')
    .where('type', TEXTRACT_TYPES.FORM)
    .whereNotNull('textractJobId')
    .whereNull('data')
    .orderBy('id')
    .first();
  if (textractJob) {
    console.log(dateTime, `Textract Analysis Fetch: Job #${textractJob.id}`);
  } else {
    return console.log(dateTime, `Textract Analysis Fetch: No job to fetch.`);
  }
  // Fetch textract job data
  const textractJobData = await getDocumentAnalysis(textractJob.textractJobId);

  if (textractJobData) {
    // Update database record
    await knex('textract_job')
      .where({ id: textractJob.id })
      .update({ data: textractJobData });
    console.log(dateTime, `Textract Analysis Fetch: Finished: #${textractJob.id}`);
  } else {
    console.log(dateTime, `Textract Analysis Fetch: In Progress: #${textractJob.id}`);
  }
});

// Textract Text - Detection/Extraction Start
schedule.scheduleJob('*/15 * * * * *', async (dateTime) => {
  console.log(dateTime, 'Textract Text Detection: Running');
  // Get a job to analyze
  const textractJob = await knex('textract_job')
    .where('type', TEXTRACT_TYPES.TEXT)
    .whereNull('textractJobId')
    .whereNotNull('fileBucket')
    .whereNotNull('fileKey')
    .first();
  if (textractJob) {
    console.log(dateTime, `Textract Text Detection: Job #${textractJob.id}`);
  } else {
    return console.log(dateTime, 'Textract Text Detection: No job to run.');
  }
  // Start Textract Text Detection
  const textractJobId = await startDocumentTextDetection({
    DocumentLocation: {
      S3Object: {
        Bucket: textractJob.fileBucket,
        Name: textractJob.fileKey,
      },
    },
  });
  // Create textract db record related to our record for querying later
  await knex('textract_job')
    .where('id', textractJob.id)
    .update({ textractJobId });
  console.log(dateTime, `Textract Text Detection: Finished: #${textractJob.id}`);
});

// Textract Text - Fetch & Save
schedule.scheduleJob('*/30 * * * * *', async (dateTime) => {
  console.log(dateTime, 'Textract Text Fetch: Running');
  // Get a job to fetcch
  const textractJob = await knex('textract_job')
    .where('type', TEXTRACT_TYPES.TEXT)
    .whereNotNull('textractJobId')
    .whereNull('data')
    .orderBy('id')
    .first();
  if (textractJob) {
    console.log(dateTime, `Textract Text Fetch: Job #${textractJob.id}`);
  } else {
    return console.log(dateTime, `Textract Text Fetch: No job to fetch.`);
  }
  // Fetch textract job data
  const textractJobData = await getDocumentTextDetection(textractJob.textractJobId);

  if (textractJobData) {
    // Update database record
    await knex('textract_job')
      .where({ id: textractJob.id })
      .update({ data: textractJobData });
    console.log(dateTime, `Textract Text Fetch: Finished: #${textractJob.id}`);
  } else {
    console.log(dateTime, `Textract Text Fetch: In Progress: #${textractJob.id}`);
  }
});