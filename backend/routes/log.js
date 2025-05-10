const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, '../admin-log.txt');

router.post('/', (req, res) => {
  const { action, timestamp } = req.body;
  fs.appendFile(logFile, `[${timestamp}] ${action}\n`, err => {
    if (err) return res.status(500).send('Log failed');
    res.send('Logged');
  });
});

router.get('/', (req, res) => {
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Could not load logs');
    res.send(data);
  });
});

module.exports = router;
