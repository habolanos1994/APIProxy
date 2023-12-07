const net = require('net');
const axios = require('axios');
const fs = require('fs');
const { mqttpub } = require("../mqttpublish");
const { logError } = require("../errorlog");
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

const TCPAPI = TCPAPIPort;
const Heartbeat = HeartbeatPort;

// Regex definition
const regex = /:/;

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

const server = net.createServer((socket) => {
    handleClientConnection(socket, MQTTDDATATopic, MQTTERRORTopic);
});

const server2 = net.createServer((socket) => {
    handleHeartbeatConnection(socket, MQTTHeartbeatTopic, MQTTERRORTopic);
});

server.on('error', handleError(MQTTERRORTopic));
server2.on('error', handleError(MQTTERRORTopic));

server.listen(TCPAPI, () => {
    console.log(`TCPAPI started on port ${TCPAPI}`);
    parentPort.postMessage('started');
});

server2.listen(Heartbeat, () => {
    console.log(`Heartbeat started on port ${Heartbeat}`);
    parentPort.postMessage('started');
});

function handleClientConnection(socket, dataTopic, errorTopic) {
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
    socket.on('data', async (data) => {
        const requestData = data.toString();

        //console.log(requestData);
        try {
            const response = await GetPLCIDForTrackNum('ELP', requestData);

            const dataPayload = {
                serial: requestData,
                result: response.data.plc_route_value, // NOTE: Updated to match the original
                requester: socket.remoteAddress,
            };

            mqttpub(dataTopic, dataPayload);

            let message;
            if (response.data.plc_route_value === 'PASS') {
                message = 'PASS';
            } else if (response.data.plc_route_value === 'RA') {
                message = 'RA  ';
            } else {
                message = 'FAIL';
                logError(dataPayload);
            }
            socket.write(message);
        } catch (error) {
            console.error(error);
            logError(error);
            socket.write('FAIL');
        }
    });

    socket.on('end', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    socket.on('error', (err) => {
        const errorData = {
            Error: err,
            requester: socket.remoteAddress,
        };

        mqttpub(errorTopic, errorData);
        console.error(`Socket error: ${err}`);
        logError(err);
    });
}

function handleHeartbeatConnection(socket, heartbeatTopic, errorTopic) {
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
    socket.on('data', (data) => {
        const requestData = data.toString();
        socket.write(requestData);
        const dataToSend = {
            Tnum: requestData,
            result: requestData,
            requester: socket.remoteAddress,
        };
        mqttpub(heartbeatTopic, dataToSend);
    });

    socket.on('end', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    socket.on('error', (err) => {
        console.error(`Socket error: ${err}`);
        logError(err);
        const errorData = {
            Error: err,
            requester: socket.remoteAddress,
        };
        mqttpub(errorTopic, errorData);
    });
}

function handleError(topic) {
    return (err) => {
        console.error(`Server error: ${err}`);
        logError(err);
        const data = {
            Error: err,
        };
        mqttpub(topic, data);
    };
}

async function GetPLCIDForTrackNum(loc, track1) {

    config = loadConfig();
    

    const APImode = config.ActiveAPI.keyence;
    const track1fix = track1.slice(0, track1.search(regex));
    const urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/GetPLCIDForTrackNum?loc=ELP&tracknum1=${track1fix}`;

    try {
        let response = await axios.get(urlApi);
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
    }
}
