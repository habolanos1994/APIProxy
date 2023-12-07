const net = require('net');
const os = require('os');
const { parentPort, workerData } = require("worker_threads");
const { mqttpub } = require("../funtions/mqttpublish");
const path = require('path');
sourcefile = path.basename(__filename)
const PLCController = require('../funtions/TagWrite');
const { GetDivertInfoForEquipment, GetPLCIDForEquipment, PostSerialForReceiving, GetPLCTNUMForEquipment, GetPLCIDForTrackNum, DevicePakStation1, DevicePakStation2, GetSerialNumberByCAID } = require("../funtions/APIRequest");

const {
    ServiceName,
    TCPAPIPort,
    HeartbeatPort,
    workerScript,
    MQTTDDATATopic,
    MQTTERRORTopic,
    PLCConfig,
    ProxyMode,
    APIRequest,
    PROXYURL,
    stringToArray,
    MQTTHeartbeatTopic,
} = workerData;

const APImode = PROXYURL[ProxyMode];

const port = TCPAPIPort;
const hostname = os.hostname();
const ips = getIPs();
const plcController = new PLCController(PLCConfig.IPAddress);

async function logs(type, message, event) {
    parentPort.postMessage({
        type: type,
        message: message,
        source: sourcefile,
        ServiceName: ServiceName,
        event: event
    });
}

parentPort.on('message', (message) => {
    if (message.type === 'restart' && message.serviceName === workerData.ServiceName) {
        // Perform any cleanup if necessary
        process.exit(0); // Exit gracefully
    }
});


plcController.connect().then(async () => {
    const combinedTags = [...PLCConfig.TagsProxy, ...PLCConfig.Heartbeat];
    await plcController.addTags(combinedTags);
});

plcController.on('error', (error) => {
    logs('Eventlog', 'error', 'TagError')
    logs('Errorlog', 'error', 'TagError')
});

plcController.on('setup', (validation) => {
    console.log(`Validation ${validation}:`);

    if (validation) {
        PLCConfig.Heartbeat.forEach(tag => {
            console.log(`Writing to ${tag.name}`);
            setInterval(() => {
                plcController.writeTag(tag.name, true);
            }, 1000)
            
        });


        server.listen(port, () => {
            console.log(`Server running at tcp://${hostname}:${port}/`);
            console.log(`Server running on the following IPs: ${ips.join(', ')}:${port}/`);
            logs('Status', 'Active', 'Status')
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
    const clientAddress = extractIPv4(socket.remoteAddress);
    const clientPort = socket.remotePort;
    console.log(`Client connected: ${clientAddress}:${clientPort}`);

    socket.on('data', async (data) => {



        let requestData = data.toString().trim();





        if (requestData === 'close connection') {
            socket.end();
            return;
        }

        try {
            await processData(socket, clientAddress, requestData);
        } catch (error) {
            handleSocketError(clientAddress, error, socket, requestData);
        }
    });

    socket.on('end', () => {
        console.log(`Client disconnected: ${clientAddress}:${clientPort}`);
    });

    socket.on('error', (err) => {
        handleSocketError(clientAddress, err, socket, 'SocketError');
    });
});

async function processData(socket, clientAddress, requestData) {
    if (stringToArray.useSingleRequests) {
        await processSingleRequest(socket, clientAddress, requestData);
    } else {
        await processBatchRequest(socket, clientAddress, requestData);
    }
}

async function processSingleRequest(socket, clientAddress, requestData) {
    if (isDelimitedString(requestData)) {
        console.log(parseStringArray(requestData))
        requestData = parseStringArray(requestData);
    } else if (isSpecialCase(requestData)) {
        requestData = await GetSerialNumberByCAID(requestData);
    }
    const response = await ApiCall(clientAddress, requestData, APImode, stringToArray.delimiter);



    if (response.success) {
        socket.write(response);   
    }
    processResponse(clientAddress, [{ scan: requestData, response }]);
}

async function processBatchRequest(socket, clientAddress, requestData) {
    let dataArray = parseDataArray(requestData);
    let scansAndResponses = [];

    for (const scan of dataArray) {
        let modifiedScan = isSpecialCase(scan) ? await GetSerialNumberByCAID(scan) : scan;
        const response = await ApiCall(clientAddress, modifiedScan, APImode);
        if (!response.success) {
            socket.write(response);   
        }

        scansAndResponses.push({ scan: modifiedScan, response });
    }

    processResponse(clientAddress, scansAndResponses);
}

function isDelimitedString(data) {
    return stringToArray.enable && typeof data === 'string' && data.includes(stringToArray.delimiter);
}

function isSpecialCase(scan) {
    return scan && scan.startsWith('R') && scan.length === 11;
}

function parseDataArray(requestData) {
    // Check if the stringToArray feature is enabled and the requestData is a string
    if (stringToArray.enable && typeof requestData === 'string') {
        // Check if requestData contains the specified delimiter
        if (requestData.includes(stringToArray.delimiter)) {
            // If so, split the requestData into an array based on the delimiter
            return requestData.split(stringToArray.delimiter);
        }
    }

    // If stringToArray is not enabled, or requestData is not a string, 
    // or it doesn't contain the delimiter, then wrap requestData in an array
    return [requestData];
}

function parseStringArray(requestData) {
    // Check if requestData is already an array of strings
    if (Array.isArray(requestData) && requestData.every(item => typeof item === 'string')) {
        return requestData;
    }

    // If requestData is a string and stringToArray feature is enabled
    if (stringToArray.enable && typeof requestData === 'string') {
        // Check if requestData contains the specified delimiter
        if (requestData.includes(stringToArray.delimiter)) {
            // Split the requestData into an array based on the delimiter
            return requestData.split(stringToArray.delimiter);
        } else {
            // If the delimiter is not found, return requestData as a single-element array
            return [requestData];
        }
    }

    // If none of the above conditions are met, return an empty array or a default value
    // Depending on your application's logic, you might want to handle this case differently
    return []; 
}



function handleSocketError(clientAddress, error, socket, scan) {
    console.error(`Socket error for ${clientAddress}: ${error.message}`);
    socket.write('FAIL');

    const errorData = {
        serial: scan || 'Unknown',
        requester: clientAddress,
        error: error.message
    };
    mqttpub(MQTTERRORTopic, errorData);
}



async function ApiCall(controllerip, Scan, APImode) {

    // console.log(APImode)


    let result;
    try {
        switch (APIRequest) {
            case 'GetDivertInfoForEquipment':
                // Implement your logic here
                break;
            case 'GetPLCIDForEquipment':
                // Implement your logic here
                break;
            case 'PostSerialForReceiving':
                result = await PostSerialForReceiving(loc, Scan, controllerip, APImode);
                return result

            case 'GetPLCTNUMForEquipment':
                result = await GetPLCTNUMForEquipment(Scan, controllerip, APImode);
                return result
            case 'GetPLCIDForTrackNum':
                result = await GetPLCIDForTrackNum(loc, Scan, controllerip, APImode);
                data = result.plc_route_value === 'PASS' ? 'PASS' : result.plc_route_value === 'RA' ? 'RA  ' : 'FAIL';
                // Rest of the logic
                return (`${data} 200`);
            case 'DevicePakAPIStation1':
                result = await DevicePakStation1(controllerip, Scan, APImode);
                return result
            case 'DevicePakAPIStation2':
                result = await DevicePakStation2(controllerip, Scan, APImode);
                return result
            default:
                throw new Error(`Unhandled APIRequest type: ${APIRequest}`);
        }
    } catch (error) {
        logs('Eventlog', error.message, 'APICallError')
        logs('Errorlog', error.message, 'APICallError')
        console.error(`Error in ApiCall: ${error}`);
        return { success: false, error: error.message };
    }
}

function processResponse(controllerip, scansAndResponses) {
    const data = scansAndResponses.map(item => ({
        serial: item.scan,
        requester: extractIPv4(controllerip),
        result: item.response
    }));

    // If there's only one item in the array, publish it as an object
    // Otherwise, publish the entire array
    const responseData = data.length === 1 ? data[0] : data;

    if (controllerip == PLCConfig.IpFilter) {
        PLCConfig.TagsProxy.forEach(Writetag => {
            plcController.writeTag(Writetag.name, responseData.serial);
        });
    }

    mqttpub(MQTTDDATATopic, responseData);
}

function extractIPv4(address) {
    const result = /::ffff:(\d+\.\d+\.\d+\.\d+)/.exec(address);
    return result ? result[1] : address;
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
    mqttpub(MQTTERRORTopic, JSON.stringify(err));
});

