const express = require('express');
const bodyParser = require('body-parser');
const Env = require('./env');
const records = require('./records/routes');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API
app.use(records);
// - Error Handler
app.use((err, req, res, next) => res.status(500).send(err));
// - Start Server
app.listen(Env.getPort(), () => console.log(`API Server Port: ${Env.getPort()}`));

// CRON
require('./records/scheduled');