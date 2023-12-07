const net = require('net');
const axios = require('axios');
const fs = require('fs');
const { mqttpub } = require("./mqttpublish")
const os = require('os');
const hostname = os.hostname();
const { logError } = require("./errorlog")

const TCPAPI = 8083;
const Heartbeat = 8038;

const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  socket.on('data', async (data) => {
    const requestData = data.toString();

    console.log(requestData)
    try {
      const response = await GetPLCIDForTrackNum('ELP', requestData);

      const data = {
        serial: requestData,
        result: response.plc_route_value,
        requester: socket.remoteAddress,
      };
      mqttpub(`ELP/Returns/PROXY/AECV2/DDATA`, data)

      let message;
      if (response.plc_route_value === 'PASS') {
        message = 'PASS'
      } else if (response.plc_route_value === 'RA') {
        message = 'RA  '
      } else {
        message = 'FAIL'
        logError(data)
      }
      socket.write(message);
    } catch (error) {
      console.error(error);
      logError(error)
      socket.write('FAIL');
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

    mqttpub(`ELP/Returns/PROXY/AECV2/Error`, data)
    console.error(`Socket error: ${err}`);
    logError(err)
  });
});

async function GetPLCIDForTrackNum(loc, track1) {
  let config;
  try {
    const configFile = fs.readFileSync('./APIMode.json');
    config = JSON.parse(configFile);
  } catch (error) {
    console.error("Failed to parse config:", error);
    logError(error)
    throw error;
  }

  let APImode = config.ActiveAPI.AEC;
  const urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/GetPLCIDForTrackNum?loc=ELP&tracknum1=${track1}`;

  try {
    let response = await axios.get(urlApi);
    return response.data;
  } catch (error) {
    console.error(error);
    logError(error)
    throw error;
  }
}

// Heartbeat server
const server2 = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  socket.on('data', (data) => {
    const requestData = data.toString();
    socket.write(requestData);
    const dataToSend = {    // Changed variable name to 'dataToSend'
      Tnum: requestData,
      result: requestData,
      requester: socket.remoteAddress,
    };
    mqttpub(`ELP/Returns/PROXY/Heartbeat_AEC/DDATA`, dataToSend);  // And here
  });

  socket.on('end', () => {
    console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
  });

  socket.on('error', (err) => {
    console.error(`Socket error: ${err}`);
    logError(err)
    const dataToSend = {  // And also here
      Error: err,
      requester: socket.remoteAddress,
    };
    mqttpub(`ELP/Returns/PROXY/AECV2/Error`, dataToSend);  // And here
  });
});

server2.on('error', (err) => {
  console.error(`Server error: ${err}`);
  logError(err)
  const data = {
    Error: err,
  };
  mqttpub(`ELP/Returns/PROXY/Heartbeat_AEC/Error`, data);
});

server.on('error', (err) => {
  console.error(`Server error: ${err}`);
  logError(err)
  const data = {
    Error: err,
  };
  mqttpub(`ELP/Returns/PROXY/AECV2/Error`, data);
});


server2.listen(Heartbeat, () => {
  console.log(`Heartbeat started on port ${Heartbeat}`);
});

server.listen(TCPAPI, () => {
  console.log(`TCPAPI started on port ${TCPAPI}`);
});
