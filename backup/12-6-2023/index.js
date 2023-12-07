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



function launchWorker(config) {



    const { 
        ProxyMode,
        ServiceName, 
        TCPAPIPort, 
        HeartbeatPort, 
        workerScript, 
        MQTTDDATATopic, 
        MQTTERRORTopic, 
        MQTTHeartbeatTopic,
        PLCConfig,
        PROXYURL
    } = config;

    logService.eventlog('Lunch Work', sourcefile, config.ServiceName, 'start');


    if (workers[ServiceName]) {
        console.warn(`Service ${ServiceName} already exists.`);
        logService.eventlog('Lunch warn', sourcefile, ServiceName, 'Service ${ServiceName} already exists.');
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
            MQTTHeartbeatTopic,
            PLCConfig,
            PROXYURL,
            ProxyMode
        },
    });

    worker.on("error", (error) => {
        workerStatus[ServiceName] = 'error';
        console.error(`Error in Service ${ServiceName}:`, error);
        logService.eventlog(error, sourcefile, ServiceName, 'Error');
        logError.logError(error, sourcefile, ServiceName, `Error`);
    });
    
    worker.on("exit", (code) => {
  

        if (code !== 0) {
            workerStatus[ServiceName] = 'exit';
            logService.eventlog('Work Exit', sourcefile, ServiceName, 'exit');
            console.error(`Service ${ServiceName} worker stopped with exit code ${code}`);
            logError.logError(code, sourcefile, ServiceName, `Error`);
            logService.eventlog('exit', ServiceName, code); 
            console.log(`Relaunching worker for Service ${ServiceName} due to failure.`);
            setTimeout(() => launchWorker(config), RELAUNCH_DELAY_MS);
        }

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
                launchWorker(config);
            }).catch(err => {
                console.error(`Could not terminate worker for Service ${data.source}:`, err);
                logError.logError(err, data.source, data.ServiceName, 'error');
            });
        } 
    });
    
    workers[ServiceName] = worker;
}

proxyConfigs.forEach(launchWorker);
