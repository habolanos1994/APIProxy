const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const port = 8080;
const os = require('os');
const hostname = os.hostname();

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'node_modules', 'papaparse')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'apiDocumentation.html'));
});

app.get('/updateAPI', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'updateAPI.html'));
});

app.get('/getAPIMode', (req, res) => {
  fs.readFile('APIMode.json', 'utf8', (err, data) => {
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

  fs.readFile('APIMode.json', 'utf8', (err, data) => {
    if (err) {
      console.log(`Error reading file from disk: ${err}`);
    } else {
      const APIMode = JSON.parse(data);

      // Update the URL for the selected service
      APIMode.ActiveAPI[service] = APIMode.URLAPI[option];

      fs.writeFile('APIMode.json', JSON.stringify(APIMode, null, 2), (err) => {
        if (err) {
          console.log(`Error writing file: ${err}`);
        }
      });
    }
  });

  res.redirect('/');
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


app.get('/mqttLog2', (req, res) => {
  fs.readFile('mqttlog.json', 'utf8', (err, data) => {
    if (err) {
      console.log(`Error reading file from disk: ${err}`);
      res.status(500).send("Error reading MQTT log");
    } else {
      const logs = JSON.parse(data);
      let output = '';
      for(let key in logs) {
        output += `<h2>${key}</h2><pre>${JSON.stringify(logs[key], null, 2)}</pre>`;
      }
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
         <meta http-equiv="refresh" content="5">
          <title>MQTT Log</title>
          <style>
            /* your styles here */
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to MQTT Log!</h1>
            <div id="mqtt-container" class="mqtt-container">
              ${output}
            </div>
            <a href="/"><button>Back to API Documentation</button></a>
          </div>
        </body>
        </html>
      `);
    }
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

app.listen(port, () => {
  console.log(`Server running at ${hostname}:${port}`);
});
