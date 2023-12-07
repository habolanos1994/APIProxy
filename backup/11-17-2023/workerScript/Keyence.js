const fs = require("fs");
const { mqttpub } = require("../mqttpublish");
const net = require('net');
const axios = require('axios');
const os = require('os');
const { parentPort, workerData } = require("worker_threads");
const { logError } = require("../errorlog");
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

const serialNumbersSet = new Set();
const regex = /[:]/;

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


async function PostSerialForReceiving(srl) {

    config = loadConfig();
    

    const APImode = config.ActiveAPI.keyence;
    const serialfix = srl.slice(0, srl.search(regex));
    const urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/PostSerialForReceiving?loc=ELP&srl=${serialfix}`;

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

async function checkAndUpdateCSV(serialNumber, requester) {
    if (serialNumbersSet.has(serialNumber)) return;

    let response = await PostSerialForReceiving(serialNumber);

    const data = {
        serial: serialNumber,
        requester: requester,
    };

    if (response.success) {
        data.result = response.data;
        mqttpub(MQTTDDATATopic, data);
    } else {
        data.result = response.error;
        mqttpub(MQTTERRORTopic, data);
    }

    serialNumbersSet.add(serialNumber);
    fs.appendFileSync("serialNumbers.csv", serialNumber + "\n");
}

const server = net.createServer((socket) => {
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', async (data) => {
        try {
            await checkAndUpdateCSV(data.toString().trim(), socket.remoteAddress);
        } catch (error) {
            console.error('Error processing serial number:', error);
            logError(error);
        }
    });

    socket.on('end', () => {
        console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    });

    socket.on('error', (err) => {
        console.error(`Socket error: ${err}`);
        logError(err);
    });
});

server.on('error', (err) => {
    console.error(`Server error: ${err}`);
    logError(err);
});

function clearCSV() {
    fs.writeFileSync("serialNumbers.csv", "");
    serialNumbersSet.clear();
}

// Clear the CSV file every 4 hours (14400000 ms)
setInterval(clearCSV, 14400000);

server.listen(TCPAPIPort, () => {
    console.log(`Server listening on: ${os.hostname()}:${TCPAPIPort}`);
    parentPort.postMessage('started');
});

clearCSV();
