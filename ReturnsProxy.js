const express = require('express');
const https = require('https');
const fs = require("fs");
const path = require("path");
const { Worker } = require("worker_threads");
const logService = require('./funtions/eventlog');
const ErrorLogger = require('./funtions/errorlog')
const logError = new ErrorLogger();

const setupMiddlewares = require('./website-config/middlewareConfig')
const routes = require('./routes');
const { notFoundHandler, generalErrorHandler } = require('./website-config/errorHandler');
const { port, sourcefile, hostname } = require('./website-config/variables');

const ProxyConfigsFile = path.join(__dirname, "./jsonfiles/proxy-configs.json");
const proxyConfigs = JSON.parse(fs.readFileSync(ProxyConfigsFile));

const RELAUNCH_DELAY_MS = 500; 

const workers = {};
let workerStatus = {}; 
const app = express();

// Configurations
setupMiddlewares(app);

// Routes
routes(app);

app.get('/workerStatus', (req, res) => {
    let status = [];
    for (const serviceName in workers) {
        status.push({
            serviceName: serviceName,
            status: workerStatus[serviceName] || "unknown"
        });
    }
    res.json(status);
});

app.post('/restartWorker', (req, res) => {
    const serviceName = req.body.serviceName;

    if (!serviceName || !workers[serviceName]) {
        return res.status(400).send('Invalid service name.');
    }

    workers[serviceName].postMessage({ serviceName: serviceName, type: 'restart' });
    res.send(`Restart command sent to worker for Service ${serviceName}`);
});


app.post('/restartAllWorkers', (req, res) => {
    for (const serviceName in workers) {
        workers[serviceName].postMessage({ serviceName: serviceName, type: 'restart' });
    }
    res.send(`Restart command sent to all workers.`);
});


// Error Handlers
app.use(notFoundHandler);
app.use(generalErrorHandler);

app.listen(port, () => {
    console.log(`Server running at ${hostname}:${port}`);
});



function launchWorker(serviceName) {
    // Read the latest configuration from file
    const proxyConfigs = JSON.parse(fs.readFileSync(ProxyConfigsFile));
    const config = proxyConfigs.find(c => c.ServiceName === serviceName);

    if (!config) {
        console.error(`No configuration found for Service ${serviceName}`);
        return;
    }



    const { 
        ServiceName,
        TCPAPIPort,
        HeartbeatPort,
        workerScript,
        MQTTDDATATopic,
        MQTTERRORTopic,
        PLCConfig,
        ProxyMode,
        APIRequest,
        PROXYURL,
        stringToArray,
        MQTTHeartbeatTopic,
    } = config;

    logService.eventlog('Lunch Work', sourcefile, config.ServiceName, 'start');


    if (workers[ServiceName]) {
        console.warn(`Service ${ServiceName} already exists.`);
        logService.eventlog('Lunch warn', sourcefile, config.ServiceName, 'already exists');
        return;
    }

    const workerPath = path.join(__dirname, 'workerScript', workerScript);

    const worker = new Worker(workerPath, {
        workerData: {
            ServiceName,
            TCPAPIPort,
            HeartbeatPort,
            workerScript,
            MQTTDDATATopic,
            MQTTERRORTopic,
            PLCConfig,
            ProxyMode,
            APIRequest,
            PROXYURL,
            stringToArray,
            MQTTHeartbeatTopic
        },
    });

    worker.on("error", (error) => {
        workerStatus[ServiceName] = 'error';
        console.error(`Error in Service ${ServiceName}:`, error);
        logService.eventlog(error, sourcefile, ServiceName, 'Error');
        logError.logError(error, sourcefile, ServiceName, `Error`);
    });
    
    worker.on("exit", (code) => {


            workerStatus[ServiceName] = 'exit';

            logService.eventlog('Work Exit', sourcefile,  config.ServiceName, 'exit');
            console.error(`Service ${ServiceName} worker stopped with exit code ${code}`);
            logError.logError(code.toString(), sourcefile,  config.ServiceName, `Error`); 
            console.log(`Relaunching worker for Service ${ServiceName} due to failure.`);
            delete workers[config.ServiceName];
            setTimeout(() => launchWorker(config.ServiceName), RELAUNCH_DELAY_MS);
    

    });
    
    worker.on("message", (data) => {
        if (data.type === 'Errorlog') {
            logError.logError(data.message, data.source, data.ServiceName, data.event)
        } else if (data.type === 'Status'){
            workerStatus[data.ServiceName] = data.message
            logService.eventlog(data.message, data.source, data.ServiceName, data.event);
        } else if (data.type === 'Eventlog'){
            logService.eventlog(data.message, data.source, data.ServiceName, data.event);
        } else if (data.type === 'restart') {
            workerStatus[ServiceName] = 'restart';
            const logstring = `Restarting worker for Service ${data.source}`
            logService.eventlog(logstring, data.source, data.ServiceName, 'restart');

            workers[data.source].terminate().then(() => {
                delete workers[data.source];
                launchWorker(data.ServiceName);
            }).catch(err => {
                console.error(`Could not terminate worker for Service ${data.source}:`, err);
                logError.logError(err, data.source, data.ServiceName, 'error');
            });
        } 
    });
    
    workers[ServiceName] = worker;
}

proxyConfigs.forEach(config => launchWorker(config.ServiceName));
