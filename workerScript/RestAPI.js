const express = require("express");
const { GetDivertInfoForEquipment ,GetPLCIDForEquipment, PostSerialForReceiving, GetPLCTNUMForEquipment, GetPLCIDForTrackNum, DevicePakStation1, DevicePakStation2 } = require("../funtions/APIRequest");
const ErrorLogger = require('../funtions/errorlog')
const logError = new ErrorLogger();
const os = require('os');
const hostname = os.hostname();
const fs = require('fs');
const path = require('path');
const { parentPort, workerData } = require("worker_threads");

const sourcefile = path.basename(__filename);

const app = express();

const {
  ServiceName, 
  TCPAPIPort, 
  HeartbeatPort, 
  workerScript, 
  MQTTDDATATopic, 
  MQTTERRORTopic, 
  MQTTHeartbeatTopic,
  PLCConfig,
  PROXYURL,
  stringToArray,
  ProxyMode
} = workerData;

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
      console.log('/////exit')
      process.exit(0); // Exit gracefully
  }
});


const port = TCPAPIPort;




app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get("/a", (_, res) => {
  res.json({ message: "ok" });
});

app.get("/Programs_NET_2/RCVX/api/RCV/GetPLCIDForEquipment", async (req, res) => {
  res.setHeader('Content-Type', 'application/json');


  const APImode = await PROXYURL.GetPLCIDForEquipment[ProxyMode.GetPLCIDForEquipment]

  if ('tnum' in req.query && !('srl' in req.query)) {
   response = await GetPLCTNUMForEquipment(req.query.tnum, req.ip, APImode);


  } else {
    response = await GetPLCIDForEquipment(req.query.tnum, req.query.loc, req.query.srl, req.query.sensor, res, req.ip);
  }
  res.send(response);
});

app.get("/Programs_NET_2/RCVX/api/RCV/GetPLCIDForTrackNum", async (req, res) => {
  res.setHeader('Content-Type', 'application/json');


  const APImode = await PROXYURL.GetPLCIDForTrackNum[ProxyMode.GetPLCIDForTrackNum]

  response = await GetPLCIDForTrackNum(req.query.loc, req.query.tracknum1, req.ip, APImode);
  res.send(response);
});

app.get("/Programs_NET_2/RCVX/api/RCV/GetDivertInfoForEquipment", async (req, res) => {
  res.setHeader('Content-Type', 'application/json');


  const APImode = await PROXYURL.GetDivertInfoForEquipment[ProxyMode.GetDivertInfoForEquipment]
//console.log(req.query)
response = await  GetDivertInfoForEquipment(
        req.query.tnum,
        req.query.loc,
        req.query.srl,
        req.query.divertinfo,
        req.query.code,
        req.ip,
        APImode)

        res.send(response);
});

app.get("/Programs_NET_2/RCVX/api/RCV/PostSerialForReceiving", async (req, res) => {
  res.setHeader('Content-Type', 'application/json');



  const APImode = await PROXYURL.PostSerialForReceiving[ProxyMode.PostSerialForReceiving]

  if ('loc' in req.query && 'srl' in req.query) {
    response = await PostSerialForReceiving(req.query.loc, req.query.srl, req.ip, APImode);
  } else {
    response =  "Query Fail please follow the query: loc: 'string', srl: 'string'" 
  }

  res.send(response);
});

app.get("/Applications/DevicePakAPI/api/DBS/Station1", async (req, res) => {
  res.setHeader('Content-Type', 'application/json');


  const APImode = await PROXYURL.DevicePakAPIStation1[ProxyMode.DevicePakAPIStation1]

  response = await DevicePakStation1(req.ip, req.query.srl,APImode)

  res.send(response);
});

app.get("/Applications/DevicePakAPI/api/DBS/Station1", async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  
  const APImode = await PROXYURL.DevicePakAPIStation2[ProxyMode.DevicePakAPIStation2]

  response = await DevicePakStation2(req.ip, req.query.srl,APImode)

  res.send(response);
});

app.get("/hearthbeat", (_, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send("online");
});


app.use((req, res) => {
  res.status(404).send('Cannot GET /');
  logs('Eventlog', `Cannot GET / ${req.ip}`, ServiceName);
  SendToMQTT(`errorApiNotFound:${req.originalUrl},Requestor:${req.ip}`)
  logError(`errorApiNotFound:${req.originalUrl},Requestor:${req.ip}`)
});

// Log the error message
app.use((err, req, res, next) => {

  logError.logError(err, sourcefile, ServiceName, 'Error')
  console.error(`Error: ${err.message}`);
  next(err);
});

app.listen(port, () => {
  console.log(`Server started: ${hostname}:${port}`);
  logs('Status', 'Active', 'Status')
});

