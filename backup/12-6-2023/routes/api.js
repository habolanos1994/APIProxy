const express = require('express');
const fs = require("fs");
const path = require('path');
const router = express.Router();
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const logService = require('../funtions/eventlog');



router.get('/getAPIMode', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    fs.readFile('./jsonfiles/proxy-configs.json', 'utf8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
            res.status(500).send("Error reading API configuration");
        } else {
            const proxyConfigs = JSON.parse(data);
            const detailedConfigs = proxyConfigs.map(service => {
                let activeURL = '';
                if (typeof service.ProxyMode === 'object') {
                    activeURL = Object.entries(service.ProxyMode).reduce((acc, [key, mode]) => {
                        acc[key] = service.PROXYURL[key][mode];
                        return acc;
                    }, {});
                } else {
                    activeURL = service.PROXYURL[service.ProxyMode];
                }
                return {
                    ServiceName: service.ServiceName,
                    TCPAPIPort: service.TCPAPIPort,
                    HeartbeatPort: service.HeartbeatPort,
                    MQTTDDATATopic: service.MQTTDDATATopic,
                    MQTTERRORTopic: service.MQTTERRORTopic,
                    PLCConfig: service.PLCConfig,
                    ProxyMode: service.ProxyMode,
                    PROXYURL: service.PROXYURL,
                    activeURL
                };
            });
            res.json(detailedConfigs);
        }
    });
});



router.post('/updateAPI', (req, res) => {
    console.log('Received body:', req.body);
    const { service, proxyMode, proxyURL } = req.body;

    fs.readFile('./jsonfiles/proxy-configs.json', 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file from disk: ${err}`);
            return res.status(500).send("Error updating API configuration");
        }

        let proxyConfigs = JSON.parse(data);

        // Find the service in the configuration
        const serviceIndex = proxyConfigs.findIndex(svc => svc.ServiceName.toLowerCase() === service.toLowerCase().trim());
        if (serviceIndex === -1) {
            console.error('Service not found:', service);
            return res.status(404).send("Service not found");
        }

        const serviceToUpdate = proxyConfigs[serviceIndex];

        // Update ProxyMode - Directly assigning the value from the proxyMode object
        serviceToUpdate.ProxyMode = proxyMode.proxyMode;

        // Update PROXYURL
        if (proxyURL && typeof proxyURL === 'object') {
            Object.entries(proxyURL).forEach(([key, value]) => {
                serviceToUpdate.PROXYURL[key] = value;
            });
        }

        // Replace the old service data with updated data
        proxyConfigs[serviceIndex] = serviceToUpdate;

        // Write the updated configuration back to the file
        fs.writeFile('./jsonfiles/proxy-configs.json', JSON.stringify(proxyConfigs, null, 2), (writeErr) => {
            if (writeErr) {
                console.error(`Error writing file: ${writeErr}`);
                return res.status(500).send("Error writing API configuration");
            }
            res.json({ message: "API configuration updated successfully", redirect: "/" });
        });
    });
});



router.get('/logs', (req, res) => {
    exec('sudo journalctl -u returnsproxy.service -e', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Error executing journalctl command');
        }

        // Display logs as plain text for simplicity
        res.setHeader('Content-Type', 'text/plain');
        res.send(stdout);
    });
});


router.get('/getErrorLog', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    fs.readFile('errorlog.csv', 'utf8', (err, data) => {
        if (err) {
            console.log(`Error reading file from disk: ${err}`);
            res.status(500).send("Error reading error log");
        } else {
            res.type('text/csv');
            res.send(data);
        }
    });
});

router.post('/clearErrorLog', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    fs.writeFile('errorlog.csv', '', (err) => {
        if (err) {
            console.log(`Error clearing file: ${err}`);
            res.status(500).send("Error clearing error log");
        } else {
            res.sendStatus(200);
        }
    });
});

router.get('/Eventlog', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {

        const logs = logService.getAllLogs();
        const logArray = Array.isArray(logs) ? logs : [logs];
        res.json({
            success: true,
            logEntries: logArray
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred while fetching logs.', error: error.message });
    }
});

module.exports = router;