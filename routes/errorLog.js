const express = require('express');
const fs = require('fs').promises; // Make sure to use fs.promises for promise-based operations
const router = express.Router();
const path = require('path')
const ErrorLogger = require('../funtions/errorlog.js');
const errorLogger = new ErrorLogger();
const sourcefile = path.basename(__filename);


// Endpoint to get the error log
router.get('/getErrorLog', async (req, res) => {
    try {
        const logData = await fs.readFile(errorLogger.logFilePath, 'utf8');
        res.send(logData);
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

// Endpoint to clear the error log
router.post('/clearErrorLog', async (req, res) => {
    try {
        await fs.writeFile(errorLogger.logFilePath, '');
        res.status(200).send('Log cleared');
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

module.exports = router;