const net = require('net');
const fs = require('fs');
const axios = require('axios');
const { mqttpub } = require("../mqttpublish");
const os = require('os');
const hostname = os.hostname();
const ips = getIPs();
const { logError } = require("../errorlog");

const { parentPort, workerData } = require("worker_threads");
const path = require('path');
const jsonPath = path.join(__dirname, '../jsonfiles/APIMode.json');

const regex = /[:]/;

const {
  ServiceName,
  TCPAPIPort,
  HeartbeatPort,
  workerScript,
  MQTTDDATATopic,
  MQTTERRORTopic,
  MQTTHeartbeatTopic,
} = workerData;


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

const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  const id = `Client connected: ${socket.remoteAddress}:${socket.remotePort}`
  socket.on('data', async (data) => {
    const requestData = data.toString();

    if (requestData == 'close connection') {
      socket.end();
    } else {
      console.log(requestData);
      try {
        const response = await GetPLCIDForTrackNum(socket.remoteAddress, requestData);

        mqttpub(MQTTDDATATopic, data);

        console.log(response.data);
        socket.write(response.data);
        socket.write(id);
      } catch (error) {
        console.error(error);
        logError(error);
        socket.write('FAIL');
      }
    }
  });

  socket.on('end', () => {
    console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
  });

  socket.on('error', (err) => {
    const data = {
      Error: err,
      requester: socket.remoteAddress,
    };

    mqttpub(MQTTERRORTopic, data);
    console.error(`Socket error: ${err}`);
    logError(err);
  });
});



async function GetPLCIDForTrackNum(plcip, srl) {

  config = loadConfig();

  const APImode = config.ActiveAPI.keyence;
  const serialfix = srl.slice(0, srl.search(regex));
  const urlApi = `${APImode}Applications/DevicePakAPI/api/DBS/Station1?ip=${plcip}&serial=${serialfix}`;
console.log(urlApi)
  try {
      // Use in a development environment or with self-signed certificates.
//        let response = await axios.get(urlApi, {
//            httpsAgent: new (require('https').Agent)({
//                rejectUnauthorized: false
//            })
//        });

      // For production, use the line below instead.
      let response = await axios.get(urlApi);
//	console.log(response)
      return {
          success: true,
          data: response.data
      };
  } catch (error) {
      console.error("Error getting API data:", error);
      logError(error);
      return {
          success: false,
          error: error.message
      };
      //throw error;
  }
}


server.on('error', (err) => {
  console.error(`Server error: ${err}`);
  logError(err);
  const data = {
    Error: err,
  };
  mqttpub(MQTTERRORTopic, data);
});

server.listen(port, () => {
    console.log(`Server running at https://${hostname}:${port}/`);
    console.log(`Server running at https://${ips}:${port}/`);
    parentPort.postMessage('started');

});

function getIPs() {
    const ips = [];
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
      for (const interface of interfaces[name]) {
        // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        if (interface.family === 'IPv4' && !interface.internal) {
          ips.push(interface.address);
        }
      }
    }
    return ips.length > 0 ? ips : 'No IPv4 address found!';
}
