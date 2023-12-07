const net = require('net');
const axios = require('axios');
const fs = require('fs');
const { mqttpub } = require("./mqttpublish")
const os = require('os');
const { logError } = require("./errorlog")

const TCPAPI = 8084;
const Heartbeat = 8048;

const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  socket.on('data', async (data) => {
    const requestData = data.toString();

    //console.log(requestData)
    try {
      const response = await PostSerialForReceiving('ELP', requestData);

      const data = {
        serial: requestData,
        result: response,
        requester: socket.remoteAddress,
      };
      mqttpub(`ELP/Returns/PROXY/SickClarify/DDATA`, data)

     
      socket.write(response+' '+'200');
      
    } catch (error) {
      console.error(error);
      logError(error)
      socket.write('FAIL      400');
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

    mqttpub(`ELP/Returns/PROXY/SickClarify/Error`, data)
    console.error(`Socket error: ${err}`);
    logError(err)
  });
});

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
    mqttpub(`ELP/Returns/PROXY/Heartbeat_SickClarify/DDATA`, dataToSend);  // And here
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
    mqttpub(`ELP/Returns/PROXY/Heartbeat_SickClarify/Error`, dataToSend);  // And here
  });
});

async function PostSerialForReceiving(loc, srl) {
  let config;
  try {
    const configFile = fs.readFileSync('./APIMode.json');
    config = JSON.parse(configFile);
  } catch (error) {
    console.error("Error reading or parsing APIMode.json:", error);
    logError(error)
    throw error;
  }

  let APImode = config.ActiveAPI.SickClarify;
  var urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/PostSerialForReceiving?loc=ELP&srl=${srl}`;

  try {
    let response = await axios.get(urlApi);
    return response.data;
  } catch (error) {
    console.error("Error getting API data:", error);
    logError(error)
    throw error;
  }
}

server.listen(TCPAPI, () => {
  console.log(`TCPAPI started on port ${TCPAPI}`);
});

server2.listen(Heartbeat, () => {
  console.log(`Heartbeat started on port ${Heartbeat}`);
});

server2.on('error', (err) => {
  console.error(`Server error: ${err}`);
  logError(err)
  const data = {
    Error: err,
  };
  mqttpub(`ELP/Returns/PROXY/SickClarify/Error`, data);
});


server.on('error', (err) => {
  console.error(`Server error: ${err}`);
  logError(err)
  const data = {
    Error: err,
  };
  mqttpub(`ELP/Returns/PROXY/SickClarify/Error`, data);
});
