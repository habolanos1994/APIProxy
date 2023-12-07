const net = require('net');
const fs = require('fs');
const axios = require('axios');
const https = require('https'); // Required here for better practice
const { mqttpub } = require("../mqttpublish");
const os = require('os');
const { logError } = require("../errorlog");
const { PrintLabel } = require("../funtions/zebra");
const { parentPort, workerData } = require("worker_threads");
const path = require('path');
const jsonPath = path.join(__dirname, '../jsonfiles/APIMode.json');




const {
  ServiceName,
  TCPAPIPort,
  HeartbeatPort,
  workerScript,
  MQTTDDATATopic,
  MQTTERRORTopic,
  MQTTHeartbeatTopic,
  PLCConfig
} = workerData;

const regex = /[:]/;

const debugmode = false

var config = loadConfig();

function loadConfig() {
    let localConfig;
    try {
      const configFile = fs.readFileSync(jsonPath);
      localConfig = JSON.parse(configFile);
    } catch (error) {
      console.error("Error reading or parsing jsonfiles/APIMode.json:", error);
      logError(error);
    }
    return localConfig;
}

const port = TCPAPIPort;
const hostname = os.hostname();
const ips = getIPs();

const PLCController = require('../funtions/TagWrite');


const plcController = new PLCController(PLCConfig.IPAddress);


plcController.connect().then(async () => {
  // Combine both tag arrays into one and add them
  const combinedTags = [...PLCConfig.TagsProxy, ...PLCConfig.Heartbeat];
  await plcController.addTags(combinedTags);

  // Rest of your logic, such as writing to a tag or starting a server
});

// Listen for emissions
plcController.on('setup', (validation) => {
  console.log(`Validation ${validation}:`);
  
  if (validation) {
    // Iterate over Heartbeat tags and write to them
    PLCConfig.Heartbeat.forEach(tag => {
      console.log(`Writing to ${tag.name}`);
      plcController.writeTag(tag.name, true);
    });

    // Start the server
    server.listen(port, () => {
      console.log(`Server running at tcp://${hostname}:${port}/`);
      console.log(`Server running on the following IPs: ${ips.join(', ')}:${port}/`);
      parentPort.postMessage('started');
    });
  }
});

plcController.on('Previus value:', (tagName, value) => {
  console.log(`Previous value of ${tagName}:`, value);
});

plcController.on('new value:', (tagName, value) => {
  console.log(`Writing new value to ${tagName}:`, value);
});

const server = net.createServer((socket) => {
  console.log(`Client connected: ${extractIPv4(socket.remoteAddress)}:${socket.remotePort}`);

  const controllerip = extractIPv4(socket.remoteAddress)

  socket.on('data', async (data) => {
    let requestData = data.toString().trim(); // Removes \r\n or any whitespace from both ends of the string

    console.log(requestData);

    if (requestData === 'close connection') {
      socket.end();
    } else {
      try {


        const response = await Packapp(controllerip, requestData);

        const data = {
          serial: requestData,
          requester: extractIPv4(controllerip),
        };

        if (response.success) {
          
          data.result = response.data;

          if (controllerip == PLCConfig.IpFilter) {

            PLCConfig.forEach(Writetag => {

              plcController.writeTag(Writetag.name, requestData);

            });

          }

          mqttpub(MQTTDDATATopic, data); // Convert object to string before publishing
        } else {
          data.result = response.error;
          mqttpub(MQTTERRORTopic, data); // Convert object to string before publishing
        }

        socket.write(response.data);
      } catch (error) {
        console.error(error);
        logError(error);
        socket.write('FAIL');
        const data = {
          serial: requestData,
          requester: extractIPv4(controllerip),
          error: error.message // Send only the error message, not the full error object
        };

        mqttpub(MQTTERRORTopic, data); // Convert object to string before publishing
      }
    }
  });

  socket.on('end', () => {
    console.log(`Client disconnected: ${extractIPv4(socket.remoteAddress)}:${socket.remotePort}`);
  });

  socket.on('error', (err) => {
    console.error(`Socket error: ${err}`);
    logError(err);
    const errorData = {
      Error: err.message,
      requester: extractIPv4(socket.remoteAddress)
    };
    mqttpub(MQTTERRORTopic, errorData); // Convert object to string before publishing
  });
});

function extractIPv4(address) {
  const result = /::ffff:(\d+\.\d+\.\d+\.\d+)/.exec(address);
  return result ? result[1] : address;
}

async function Packapp(plcip, srl) {
  try {
    config = loadConfig();

    if (!config) {
      throw new Error('Configuration could not be loaded');
    }

    const APImode = config.ActiveAPI.PackoutStation1;
    const serialfix = srl.match(regex) ? srl.slice(0, srl.search(regex)) : srl;
    const urlApi = `${APImode}?ip=${plcip}&serial=${serialfix}`;
    
    console.log(urlApi);
    let response;
    if (debugmode == true) {
      response = await axios.post(urlApi, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
    } else {
      response = await axios.post(urlApi);
    }

    //PrintLabel(srl);

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error("Error getting API data:", error);
    logError(error);
    throw error; 
  }
}



function getIPs() {
  const ips = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push(interface.address);
      }
    }
  }
  return ips.length > 0 ? ips : ['No IPv4 address found!'];
}

server.on('error', (err) => {
  console.error(`Server error: ${err}`);
  logError(err);
  mqttpub(MQTTERRORTopic, err);
});
