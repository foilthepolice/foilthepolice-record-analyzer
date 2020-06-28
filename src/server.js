
const dts = require('date-fns');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const uuid = require('uuid').v4;
const Env = require('./env');
const { s3, textract } = require('./aws');

const app = express();
const upload = multer();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Text Extraction on PDF
// 1) Upload file to S3 (required for PDFs)
// 2) Run async document analysis (returns job id)
// 3) Poll job id until SUCCEEDED response
// https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeDocument.html
// https://docs.aws.amazon.com/textract/latest/dg/API_StartDocumentAnalysis.html
app.post('/extract', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) throw new Error('PDF key missing file passed as form-data.')
    const s3Key = uuid();
    s3.upload({
      ACL: 'public-read',
      Body: req.file.buffer,
      Expires: dts.addMinutes(new Date(), 15),
      Key: s3Key,
    }, (err, upload) => {
      if (err) throw err;
      textract.startDocumentAnalysis({
        DocumentLocation: {
          S3Object: {
            Bucket: upload.Bucket,
            Name: upload.Key,
         }
        },
        FeatureTypes: ['FORMS'],
      }, (err, { JobId }) => {
        if (err) throw err;
        let intervalId;
        intervalId = setInterval(() => {
          textract.getDocumentAnalysis({ JobId }, (err, data) => {
            if (err) throw err;
            if (data.JobStatus === 'SUCCEEDED') {
              res.send(data);
            } else if (data.JobStatus === 'FAILED') {
              console.log('Job failed!', data)
              clearInterval(intervalId);
            } else {
              console.log('Job in progress...', data)
            }
          });
        }, 2000);
      });
    });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.listen(Env.getPort(), () => console.log(`API Server Port: ${Env.getPort()}`));
