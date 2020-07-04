const schedule = require('node-schedule');
const { knex } = require('../orm');
const { getDocumentAnalysis, startDocumentAnalysis } = require('../aws');

// Textract Analysis Start
schedule.scheduleJob('*/15 * * * * *', async (dateTime) => {
  console.log(dateTime, 'Textract Analysis: Running');
  // Get a job to analyze
  const textractJob = await knex('textract_job')
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

// Textract Fetch & Save
schedule.scheduleJob('*/5 * * * * *', async (dateTime) => {
  console.log(dateTime, 'Textract Fetch: Running');
  // Get a job to fetcch
  const textractJob = await knex('textract_job')
    .whereNotNull('textractJobId')
    .whereNull('data')
    .orderBy('id')
    .first();
  if (textractJob) {
    console.log(dateTime, `Textract Fetch: Job #${textractJob.id}`);
  } else {
    return console.log(dateTime, `Textract Fetch: No job to fetch.`);
  }
  // Fetch textract job data
  const textractJobData = await getDocumentAnalysis(textractJob.textractJobId);

  if (textractJobData) {
    // Update database record
    await knex('textract_job')
      .where({ id: textractJob.id })
      .update({ data: textractJobData });
    console.log(dateTime, `Textract Fetch: Finished: #${textractJob.id}`);
  } else {
    console.log(dateTime, `Textract Fetch: In Progress: #${textractJob.id}`);
  }
});
