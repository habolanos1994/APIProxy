const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

router.get('/updateAPI', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'updateAPI.html'));
});

router.get('/mqttLog', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'mqttLog.html'));
});

router.get('/errorLog', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'errorLog.html'));
});

router.get('/Services', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'worker-manager.html'));
});


router.get('/eventlog', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'eventlog.html'));
  });

module.exports = router;
