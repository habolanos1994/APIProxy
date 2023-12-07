const ftp = require("basic-ftp");
const fs = require("fs");
const { mqttpub } = require("./mqttpublish");
const net = require('net');
const axios = require('axios');
const os = require('os');
const hostname = os.hostname();
const TCPAPI = 8085;
const { logError } = require("./errorlog");

const serialNumbersSet = new Set();
const regex = /[:]/;

async function PostSerialForReceiving(srl) {
    let config;
    try {
        const configFile = fs.readFileSync('./APIMode.json');
        config = JSON.parse(configFile);
    } catch (error) {
        console.error("Error reading or parsing APIMode.json:", error);
        logError(error);
        throw error;
    }

    const APImode = config.ActiveAPI.keyence;
    const serialfix = srl.slice(0, srl.search(regex));
    const urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/PostSerialForReceiving?loc=ELP&srl=${serialfix}`;

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


async function checkAndUpdateCSV(serialNumber, requester) {
    if (serialNumbersSet.has(serialNumber)) {
        return;
    }

    let response = await PostSerialForReceiving(serialNumber);

    const data = {
        serial: serialNumber,
        requester: requester,
    };

    if (response.success) {
        data.result = response.data;
        mqttpub(`ELP/Returns/PROXY/Keyence/DDATA`, data);
    } else {
        data.result = response.error;
        mqttpub(`ELP/Returns/PROXY/Keyence/Error`, data);
    }

    serialNumbersSet.add(serialNumber);
    fs.appendFileSync("serialNumbers.csv", serialNumber + "\n");
}


const server = net.createServer((socket) => {
    const requester = socket.remoteAddress;
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

    socket.on('data', (data) => {
        checkAndUpdateCSV(data.toString().trim(), requester);
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

server.listen(TCPAPI, () => {
    console.log(`${hostname}:${TCPAPI}`);
});

clearCSV();

