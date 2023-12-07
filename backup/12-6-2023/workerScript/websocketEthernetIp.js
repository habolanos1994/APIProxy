const net = require('net');
const os = require('os');
const { parentPort, workerData } = require("worker_threads");
const { mqttpub } = require("../funtions/mqttpublish");
const path = require('path');
sourcefile = path.basename(__filename)
const PLCController = require('../funtions/TagWrite');
const { GetDivertInfoForEquipment ,GetPLCIDForEquipment, PostSerialForReceiving, GetPLCTNUMForEquipment, GetPLCIDForTrackNum, SendToMQTT, DevicePakStation1, DevicePakStation2, GetSerialNumberByCAID } = require("../funtions/APIRequest");

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
  
  plcController.on('setup', (validation) => {
    console.log(`Validation ${validation}:`);
    
    if (validation) {
      PLCConfig.Heartbeat.forEach(tag => {
        console.log(`Writing to ${tag.name}`);
        plcController.writeTag(tag.name, true);
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
    console.log(`Client connected: ${extractIPv4(socket.remoteAddress)}:${socket.remotePort}`);

    const controllerip = extractIPv4(socket.remoteAddress);

    socket.on('data', async (data) => {
        let requestData = data.toString().trim();
    
        if (requestData === 'close connection') {
            socket.end();
        } else {
            try {
                let scansAndResponses = []; 
    
                if (requestData.includes(',')) {
                    let dataArray = requestData.split(',');
    
                    for (const Scan of dataArray) {

                        if (Scan && Scan.startsWith('R') && Scan.length === 11) {
                            Scan = await GetSerialNumberByCAID(Scan)
                          }

                        const response = await ApiCall(controllerip, Scan);
                        scansAndResponses.push({ scan: Scan, response: response });
                    }
                } else {

                    if (requestData && requestData.startsWith('R') && requestData.length === 11) {
                        requestData = await GetSerialNumberByCAID(Scan)
                      }
                      
                    const response = await ApiCall(controllerip, requestData);
                    scansAndResponses.push({ scan: requestData, response: response });
                }
    
                processResponse(controllerip, scansAndResponses, socket);
            } catch (error) {
                console.error(error);
                socket.write('FAIL');
                const errorData = {
                    serial: requestData,
                    requester: extractIPv4(controllerip),
                    error: error.message
                };
                mqttpub(MQTTERRORTopic, JSON.stringify(errorData));
            }
        }
    });
    

    socket.on('end', () => {
        console.log(`Client disconnected: ${extractIPv4(socket.remoteAddress)}:${socket.remotePort}`);
    });

    socket.on('error', (err) => {
        console.error(`Socket error: ${err}`);
        const errorData = {
            Error: err.message,
            requester: extractIPv4(socket.remoteAddress)
        };
        mqttpub(MQTTERRORTopic, JSON.stringify(errorData));
    });
});

async function ApiCall(controllerip, Scan) {
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
                break;
            case 'GetPLCTNUMForEquipment':
                result = await GetPLCTNUMForEquipment(Scan, controllerip, APImode);
                break;
            case 'GetPLCIDForTrackNum':
                result = await GetPLCIDForTrackNum(loc, Scan, controllerip, APImode);
                break;
            case 'DevicePakStation1':
                result = await DevicePakStation1(controllerip, Scan, APImode);
                break;
            case 'DevicePakStation2':
                result = await DevicePakStation2(controllerip, Scan, APImode);
                break;
            default:
                throw new Error(`Unhandled APIRequest type: ${APIRequest}`);
        }
    } catch (error) {
        console.error(`Error in ApiCall: ${error.message}`);
        result = { success: false, error: error.message };
    }
    return result;
}

function processResponse(controllerip, scansAndResponses, socket) {
    const data = scansAndResponses.map(item => ({
        serial: item.scan,
        requester: extractIPv4(controllerip),
        result: item.response.success ? item.response.data : item.response.error

    }));

    if (controllerip == PLCConfig.IpFilter) {
        PLCConfig.TagsProxy.forEach(Writetag => {
          plcController.writeTag(Writetag.name, item.scan);
        });
      }

    mqttpub(MQTTDDATATopic, data);
    socket.write(JSON.stringify(data));
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

