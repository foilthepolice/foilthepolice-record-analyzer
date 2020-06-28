const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { getDocumentAnalysis, startDocumentAnalysis, upload } = require('../aws');

const router = Router();

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
router.post(
  '/v1/analyze/form',
  fileMiddleware.single('pdf'),
  async (req, res, next) => {
    try {
      if (!req.file) throw new Error('PDF key missing file passed as form-data.')
      const file = await upload(req.file.originalname, req.file.buffer);
      const textractJobId = await startDocumentAnalysis({
        DocumentLocation: {
          S3Object: {
            Bucket: file.bucket,
            Name: file.key,
          },
        },
        FeatureTypes: ['FORMS'],
      });
      res.status(200).send({ jobId: textractJobId });
    } catch (e) {
      next({ message: e.message });
    }
  });

// ...
// 4) Poll job id until SUCCEEDED response from all files
router.get(
  '/v1/analysis/:jobId',
  async (req, res, next) => {
    try {
      if (!req.params.jobId) throw new Error('Missing analysis job id');
      const keyValues = await getDocumentAnalysis(req.params.jobId);
      res.status(200).send(keyValues);
    } catch (e) {
      next({ message: e.message });
    }
  });

module.exports = router;
