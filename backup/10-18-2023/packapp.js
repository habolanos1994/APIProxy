const net = require('net');
const fs = require('fs');
const axios = require('axios');
const { mqttpub } = require("./mqttpublish");
const os = require('os');
const hostname = os.hostname();
const ips = getIPs();
const { logError } = require("./errorlog");

const port = 8090;

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

        mqttpub(`SUW/Returns/PROXY/Packapp/DDATA`, data);

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

    mqttpub(`ELP/Returns/PROXY/AECV2/Error`, data);
    console.error(`Socket error: ${err}`);
    logError(err);
  });
});

async function GetPLCIDForTrackNum(plcip, serial) {


  let config;
  try {
    const configFile = fs.readFileSync('./APIMode.json');
    config = JSON.parse(configFile);
  } catch (error) {
    console.error("Failed to parse config:", error);
    logError(error)
    throw error;
  }

  let APImode = config.ActiveAPI.PackoutAPP;
  const urlApi = `${APImode}Applications/DevicePakAPI/api/DBS/Station1?ip=${plcip}&serial=${serial}`;


  //const urlApi = `https://mnet-test.global.dish.com/Applications/DevicePakAPI/api/DBS/Station1?ip=${plcip}&serial=${serial}`;
   console.log(urlApi);
  try {
    let response = await axios.post(urlApi);
    return response;
  } catch (error) {
    console.error(error);
    logError(error);
    throw error;
  }
}

server.on('error', (err) => {
  console.error(`Server error: ${err}`);
  logError(err);
  const data = {
    Error: err,
  };
  mqttpub(`ELP/Returns/PROXY/AECV2/Error`, data);
});

server.listen(port, () => {
    console.log(`Server running at https://${hostname}:${port}/`);
    console.log(`Server running at https://${ips}:${port}/`);
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
