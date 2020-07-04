const fs = require('fs');
const PDFImage = require('pdf-image').PDFImage;
const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const tmp = require('tmp');
const { knex } = require('../orm');
const { upload } = require('../aws');
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
//   "success": true
// }
//
router.post(
  '/v1/analyze/form',
  fileMiddleware.single('pdf'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new Error('PDF key missing file passed as form-data.')
      console.log(new Date(), `Analyze: New Job`);
      // Create database record
      const recordJob = await knex('record_job')
        .insert({ createdAt: new Date() })
        .returning('*')
        .then((res) => res[0]);
      console.log(new Date(), `Analyze: New Job Created: #${recordJob.id}`);
      const dir = tmp.dirSync();
      console.log(new Date(), `Analyze: #${recordJob.id} - Tmp directory Created "${dir.name}"`);
      // Handle PDF prep
      const pdfPath = `${dir.name}/${req.file.originalname}`;
      fs.writeFileSync(pdfPath, req.file.buffer);
      console.log(new Date(), `Analyze: #${recordJob.id} - Converting PDF>PNGs`);
      // Handle creating PNGs
      const pdfImagePaths = await new Promise((resolve) => {
        const pdfImage = new PDFImage(pdfPath, {
          convertOptions: {
            "-density": "225",
            "-quality": "100",
          },
        });
        return pdfImage.convertFile().then(resolve)
      });
      console.log(new Date(), `Analyze: #${recordJob.id} - Converted to ${pdfImagePaths.length} PNGs`);
      // Queue an analysis job for each file
      for (let i = 0; i < pdfImagePaths.length; i += 1) {
        const imagePathIndex = i;
        const imagePath = pdfImagePaths[imagePathIndex];
        console.log(new Date(), `Analyze: #${recordJob.id} - Uploading PNG ${imagePathIndex}`);
        const buffer = fs.readFileSync(imagePath);
        // - File Upload to S3 (required for form analysis)
        const file = await upload(imagePath.slice(imagePath.lastIndexOf('/') + 1), buffer);
        // - Create textract db record to run anaylsis on via cron
        console.log(new Date(), `Analyze: #${recordJob.id} - Uploaded PNG ${imagePathIndex} and creating database record`);
        await knex('textract_job').insert({
          recordJobId: recordJob.id,
          page: imagePathIndex + 1,
          fileBucket: file.bucket,
          fileKey: file.key,
        });
      }
      // Clean up tmp files/directory
      fs.rmdirSync(dir.name, { recursive: true });
      // Respond
      console.log(new Date(), `Analyze: #${recordJob.id} - Done Uploading & Creating Records`);
      res.status(200).send({ jobId: recordJob.id, success: true });
    } catch (e) {
      console.log(e);
      next({ message: e.message });
    }
  });

// ...
// 4) Poll internal job id until SUCCEEDED response from all files. Gives back json array of report data
//
// Example response:
// {
//   data:
//     [{
//       "date": "12/27/19",
//       "time": "10:45",
//       "day_of_week": "Friday",
//       "incident_number": "19-38915",
//       "location": "1000 Route 10 Whippany, NJ",
//       "officer_badge_number": "754",
//       "officer_name": "PO Joseph Quinn III 754",
//       "officer_race": "Cauc",
//       "officer_sex": "M",
//       "officer_age": "51",
//       "officer_rank": "Patroiman",
//       "officer_on_duty": "Yes",
//       "officer_uniform": "Yes",
//       "officer_assignment": "Patrol",
//       "officer_years_of_service": "22",
//       "officer_injured": "No",
//       "officer_killed": "No",
//       "subject_race": "Black",
//       "subject_sex": "M",
//       "subject_age": "18",
//       "subject_under_influence": "",
//       "subject_unusual_conduct": "",
//     ...
//     }]
//   success: true
// }
router.get(
  '/v1/analysis/:recordJobId',
  async (req, res, next) => {
    try {
      if (!req.params.recordJobId) throw new Error('Missing analysis job id');
      // Get related textract jobs for this internal job id
      const textractJobs = await knex('textract_job')
        .where({ recordJobId: req.params.recordJobId })
        .returning('*');
      // If we have any missing data, respond in progress
      if (textractJobs.some(job => job.data == null)) {
        return res.status(200).send({ status: 'inProgress', success: true });
      }
      // Reformat keys depending on document
      // TODO: If CSV query param, restructure
      const data = Object.values(textractJobs.reduce((obj, job) => ({
        [job.page]: getStructuredUseOfForceReportData(job.data.Blocks),
        ...obj,
      }), {}));
      // Respond
      if (req.query.format === 'csv') {
        if (data.length === 0) {
          res.status(200).type('text/plain').send('');
        } else {
          const keys = Object.keys(data[0]);
          const str = `${keys.join(',')}\n${data.map(d => Object.values(d).map(v => `"${v.replace(/,/g,'')}"`).join(',')).join('\n')}`;
          res.status(200).type('text/plain').send(str);
        }
      } else {
        res.status(200).send({ data, status: 'done', success: true });
      }
    } catch (e) {
      console.log(e);
      next({ message: e.message });
    }
  });

module.exports = router;
