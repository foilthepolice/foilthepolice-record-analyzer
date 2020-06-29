const fs = require('fs');
const PDFImage = require('pdf-image').PDFImage;
const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const tmp = require('tmp');
const { knex } = require('../orm');
const { getDocumentAnalysis, startDocumentAnalysis, upload } = require('../aws');
const getStructuredUseOfForceReportData = require('./getStructuredUseOfForceReportData');

const router = Router();

// Parse PDF files submitted via multipart POSTs and place them on req.file
const fileMiddleware = multer({
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(`Error: File upload only supports the following filetypes - ${filetypes}`);
  },
});

// Text Extraction on PDF
// 1) Break down PDF into images for easier parsing...
// 2) Upload each file to S3 (required for PDFs)
// 3) Run async document analysis (returns job id)
// ...
// https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeDocument.html
// https://docs.aws.amazon.com/textract/latest/dg/API_StartDocumentAnalysis.html
//
// Example response:
// {
//   "jobId": 18,
//   "textractJobIds": [
//       "06c7647dea5e7f4c5d9e149d1fdab2ece374a9e4a0b867d5045e7755ca590fe9",
//       "05b85573d8dc2b31d367bad9cec04e7f1d109e702c8ef022a010c41373d00ed5",
//       "5b8dcce6b357e97e47d50ab35e0312860ca3d95d0f8c0251e181011318cf480e",
//       "5f3009e49ab69cc1881d215b5c31dc46173e2b12d61505e4c55905e7d6902f3f",
//       "fc5bcd4de7a66130e6ae022d5d8f8405795da225aaad30e35c2aa712c4c64e05",
//       "4c2f9f77809bbc4db765a1598647a55301a3ec42a7931eb324454e2b12993f1a",
//       "1eade3f99e7f0380f12928bf48d45f781b235eac38660e05384c1a91f478bb7c"
//   ]
// }
//
router.post(
  '/v1/analyze/form',
  fileMiddleware.single('pdf'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new Error('PDF key missing file passed as form-data.')
      // Create database record
      const recordJob = await knex('record_job')
        .insert({ createdAt: new Date() })
        .returning('*')
        .then((res) => res[0]);
      const dir = tmp.dirSync();
      // Handle PDF prep
      const pdfPath = `${dir.name}/${req.file.originalname}`;
      fs.writeFileSync(pdfPath, req.file.buffer);
      // Handle creating PNGs
      const pdfImagePaths = await new Promise((resolve) => {
        const pdfImage = new PDFImage(pdfPath, {
          convertOptions: {
            "-density": "300",
            "-quality": "100",
          },
        });
        pdfImage.convertFile().then(resolve)
      });
      // Run analysis for each file
      const textractJobIds = await Promise.all(
        pdfImagePaths.map(async (imagePath, imagePathIndex) => {
          const buffer = fs.readFileSync(imagePath);
          // - File Upload to S3 (required for form analysis)
          const file = await upload(imagePath.slice(imagePath.lastIndexOf('/') + 1), buffer);
          // - Start Analysis
          const textractJobId = await startDocumentAnalysis({
            DocumentLocation: {
              S3Object: {
                Bucket: file.bucket,
                Name: file.key,
              },
            },
            FeatureTypes: ['FORMS'],
          });
          // - Create textract db record related to our record for querying later
          await knex('textract_job').insert({
            recordJobId: recordJob.id,
            textractJobId,
            page: imagePathIndex + 1,
          });
          return textractJobId;
        }),
      )
      // Clean up tmp files/directory
      fs.rmdirSync(dir.name, { recursive: true });
      // Respond
      res.status(200).send({ jobId: recordJob.id, textractJobIds });
    } catch (e) {
      console.log(e);
      next({ message: e.message });
    }
  });

// ...
// 4) Poll internal job id until SUCCEEDED response from all files. Gives back json array of report data
//
// Example response:
// [{
//   "date": "12/27/19",
//   "time": "10:45",
//   "day_of_week": "Friday",
//   "incident_number": "19-38915",
//   "location": "1000 Route 10 Whippany, NJ",
//   "officer_badge_number": "754",
//   "officer_name": "PO Joseph Quinn III 754",
//   "officer_race": "Cauc",
//   "officer_sex": "M",
//   "officer_age": "51",
//   "officer_rank": "Patroiman",
//   "officer_on_duty": "Yes",
//   "officer_uniform": "Yes",
//   "officer_assignment": "Patrol",
//   "officer_years_of_service": "22",
//   "officer_injured": "No",
//   "officer_killed": "No",
//   "subject_race": "Black",
//   "subject_sex": "M",
//   "subject_age": "18",
//   "subject_under_influence": "",
//   "subject_unusual_conduct": "",
//   ...
// }]
router.get(
  '/v1/analysis/:recordJobId',
  async (req, res, next) => {
    try {
      if (!req.params.recordJobId) throw new Error('Missing analysis job id');
      // Get related textract jobs for this id
      const textractJobs = await knex('textract_job')
        .where({ recordJobId: req.params.recordJobId })
        .returning('*');
      // Get analysis for each
      const textractJobsData = await Promise.all(textractJobs.map(async (job) => {
        // - If we have data return, otherwise get w/ job id
        if (job.data) return job;
        const textractJobData = await getDocumentAnalysis(job.textractJobId);
        // - Save data
        await knex('textract_job').where({ id: job.id }).update({ data: textractJobData });
        return { ...job, data: textractJobData };
      }));
      // Reformat keys depending on document
      const formatted = Object.values(textractJobsData.reduce((obj, job) => ({
        [job.page]: getStructuredUseOfForceReportData(job.data.Blocks),
        ...obj,
      }), {}));
      // - If CSV query param, restructure
      res.status(200).send(formatted);
    } catch (e) {
      console.log(e);
      next({ message: e.message });
    }
  });

module.exports = router;
