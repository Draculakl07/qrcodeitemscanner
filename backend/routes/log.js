const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.post('/', (req, res) => {
  const { action, timestamp } = req.body;
  const logPath = path.join(__dirname, '../admin-log.txt');

  fs.appendFile(logPath, `[${timestamp}] ${action}\n`, err => {
    if (err) return res.status(500).send('Log failed');
    res.send('Logged');
  });
});

module.exports = router;
