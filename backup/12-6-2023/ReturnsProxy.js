const fs = require("fs");
const path = require("path");
const { Worker } = require("worker_threads");
const express = require('express');
const bodyParser = require('body-parser');
const os = require('os');
const errlog = require("./funtions/errorlog");
const { exec } = require('child_process');

const sourcefile = path.basename(__filename);
const ProxyConfigsFile = path.join(__dirname, "./jsonfiles/proxy-configs.json");
const proxyConfigs = JSON.parse(fs.readFileSync(ProxyConfigsFile));

const workers = {};
const RELAUNCH_DELAY_MS = 5000; // 5 seconds
const app = express();
const port = 80;
const hostname = os.hostname();
const workerStatus = {};

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Static files for third-party libraries and other assets
app.use('/papaparse', express.static(path.join(__dirname, 'node_modules', 'papaparse', 'dist')));
app.use('/libs', express.static(path.join(__dirname, 'node_modules')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/updateAPI', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'updateAPI.html'));
});

app.get('/getAPIMode', (req, res) => {
  fs.readFile('./jsonfiles/APIMode.json', 'utf8', (err, data) => {
    if (err) {
      console.log(`Error reading file from disk: ${err}`);
      res.status(500).send("Error reading API configuration");
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.post('/updateAPI', (req, res) => {
  const service = req.body.service;
  const option = req.body.option;

  fs.readFile('./jsonfiles/APIMode.json', 'utf8', (err, data) => {
    if (err) {
      console.log(`Error reading file from disk: ${err}`);
    } else {
      const APIMode = JSON.parse(data);

      // Update the URL for the selected service
      APIMode.ActiveAPI[service] = APIMode.URLAPI[option];

      fs.writeFile('./jsonfiles/APIMode.json', JSON.stringify(APIMode, null, 2), (err) => {
        if (err) {
          console.log(`Error writing file: ${err}`);
        }
      });
    }
  });

  res.redirect('/');
});

app.post('/editAPI', (req, res) => {
    const { section, key, newValue } = req.body;

    fs.readFile('./jsonfiles/APIMode.json', 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file: ${err}`);
            return res.status(500).send("Error reading API configuration");
        }

        let config = JSON.parse(data);

        // Check if the section and key exist
        if (config[section] && config[section].hasOwnProperty(key)) {
            // Update the value
            config[section][key] = newValue;

            // Write the updated configuration back to the file
            fs.writeFile('./jsonfiles/APIMode.json', JSON.stringify(config, null, 2), (err) => {
                if (err) {
                    console.error(`Error writing file: ${err}`);
                    return res.status(500).send("Error updating API configuration");
                }

                res.send("API configuration updated successfully");
            });
        } else {
            res.status(400).send("Invalid section or key");
        }
    });
});


app.get('/getMQTTLog', (req, res) => {
    fs.readFile('mqttlog.json', 'utf8', (err, data) => {
      if (err) {
        console.log(`Error reading file from disk: ${err}`);
        res.status(500).send("Error reading MQTT log");
      } else {
        res.json(JSON.parse(data));
      }
    });
  });

app.get('/mqttLog', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mqttLog.html'));
  });

  app.get('/logs', (req, res) => {
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

  app.get('/errorLog', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'errorLog.html'));
  });
  
  app.get('/getErrorLog', (req, res) => {
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
  
  app.post('/clearErrorLog', (req, res) => {
    fs.writeFile('errorlog.csv', '', (err) => {
      if (err) {
        console.log(`Error clearing file: ${err}`);
        res.status(500).send("Error clearing error log");
      } else {
        res.sendStatus(200);
      }
    });
  });


  app.get('/Services', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'worker-manager.html'));
  });

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

    workers[serviceName].terminate().then(() => {
        delete workers[serviceName];
        const config = proxyConfigs.find(c => c.ServiceName === serviceName);
        if (config) {
            launchWorker(config);
            res.send(`Restarted worker for Service ${serviceName}`);
        } else {
            res.status(404).send('Service configuration not found.');
        }
    }).catch(err => {
        console.error(`Could not terminate worker for Service ${serviceName}:`, err);
        res.status(500).send(`Error while restarting Service ${serviceName}`);
    });
});

app.post('/restartAllWorkers', (req, res) => {
    const workerKeys = Object.keys(workers);
    
    Promise.all(workerKeys.map(key => workers[key].terminate())).then(() => {
        for (const key of workerKeys) {
            delete workers[key];
        }
        
        proxyConfigs.forEach(launchWorker);
        res.send(`All workers restarted successfully.`);
    }).catch(err => {
        console.error(`Could not terminate one or more workers:`, err);
        res.status(500).send(`Error while restarting all workers.`);
    });
});



app.listen(port, () => {
  console.log(`Server running at ${hostname}:${port}`);
});




function launchWorker(config) {
    const { 
        ServiceName, 
        TCPAPIPort, 
        HeartbeatPort, 
        workerScript, 
        MQTTDDATATopic, 
        MQTTERRORTopic, 
        MQTTHeartbeatTopic,
        PLCConfig
    } = config;

    if (workers[ServiceName]) {
        console.warn(`Service ${ServiceName} already exists.`);
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
        },
    });

    worker.on("error", (error) => {
        console.error(`Error in Service ${ServiceName}:`, error);
        errlog.logError(error, sourcefile, `Error in Service ${ServiceName}:`);
        workerStatus[ServiceName] = 'error'
    });

    worker.on("exit", (code) => {
        if (code !== 0) {
            console.error(`Service ${ServiceName} worker stopped with exit code ${code}`);
            errlog.logError(code, sourcefile, `Service ${ServiceName} worker stopped with exit code ${code}`);
            
            console.log(`Relaunching worker for Service ${ServiceName} due to failure.`);
            workerStatus[ServiceName] = 'failed'
            
            // Introduce a delay before relaunching the worker
            setTimeout(() => {
                launchWorker(config);
            }, RELAUNCH_DELAY_MS);
        } else {
          workerStatus[ServiceName] = 'stopped';
      }

        delete workers[ServiceName];
    });

    worker.on("message", (message) => {
        if (message === 'restart') {
          workerStatus[ServiceName] = 'restart'
            console.log(`Restarting worker for Service ${ServiceName}`);
            workers[ServiceName].terminate().then(() => {
                delete workers[ServiceName];
                launchWorker(config);
            }).catch(err => {
                console.error(`Could not terminate worker for Service ${ServiceName}:`, err);
            });
        } else if (message === 'started') {
            console.log(`Service ${ServiceName} successfully started.`);
            workerStatus[ServiceName] = 'Running'
        }
    });

    workers[ServiceName] = worker;
}

proxyConfigs.forEach(launchWorker);
