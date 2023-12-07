const net = require('net');
const axios = require('axios');
const fs = require('fs');
const { mqttpub } = require("../mqttpublish");
const { logError } = require("../errorlog");

const { parentPort, workerData } = require("worker_threads");
const path = require('path');
const jsonPath = path.join(__dirname, '../jsonfiles/APIMode.json')


const {
    ServiceName,
    TCPAPIPort,
    HeartbeatPort,
    workerScript,
    MQTTDDATATopic,
    MQTTERRORTopic,
    MQTTHeartbeatTopic,
    PLCConfig,
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


async function PostSerialForReceiving(loc, srl) {

    config = loadConfig();
    
    const APImode = config.ActiveAPI.SickClarify;
    const urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/PostSerialForReceiving?loc=${loc}&srl=${srl}`;

    try {
        const response = await axios.get(urlApi);
        return response.data;
    } catch (error) {
        console.error("Error getting API data:", error);
        logError(error);
        throw error;
    }
}

function handleError(error, context = {}) {
    console.error(error);
    logError(error);
    const data = {
        Error: error.message,
        ...context
    };
    mqttpub(MQTTERRORTopic, data);
}

const server = net.createServer((socket) => {
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
    socket.on('data', async (data) => {
        const requestData = data.toString().trim();
        try {
            const response = await PostSerialForReceiving('ELP', requestData);
            const payload = {
                serial: requestData,
                result: response,
                requester: socket.remoteAddress,
            };
            mqttpub(MQTTDDATATopic, payload);
            socket.write(`${response} 200`);
        } catch (error) {
            handleError(error, { requester: socket.remoteAddress });
            socket.write('FAIL 400');
        }
    });

    socket.on('end', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    socket.on('error', (err) => {
        handleError(err, { requester: socket.remoteAddress });
    });
});

const heartbeatServer = net.createServer((socket) => {
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
    socket.on('data', (data) => {
        const requestData = data.toString().trim();
        socket.write(requestData);
        const payload = {
            Tnum: requestData,
            result: requestData,
            requester: socket.remoteAddress,
        };
        mqttpub(MQTTHeartbeatTopic, payload); // Assuming you wanted to use Heartbeat topic for this.
    });

    socket.on('end', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    socket.on('error', (err) => {
        handleError(err, { requester: socket.remoteAddress });
    });
});

server.listen(TCPAPIPort, () => {
    console.log(`TCPAPI started on port ${TCPAPIPort}`);
    parentPort.postMessage('started');
});

heartbeatServer.listen(HeartbeatPort, () => {
    console.log(`Heartbeat started on port ${HeartbeatPort}`);
    parentPort.postMessage('started');
});

server.on('error', (err) => handleError(err));
heartbeatServer.on('error', (err) => handleError(err));
