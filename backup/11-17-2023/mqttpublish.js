const mqtt = require("mqtt");
const fs = require("fs");
const { v4: uuidv4 } = require('uuid');


const caCert = fs.readFileSync("./certs/IOTVLANServices.pem");
const clientCert = fs.readFileSync("./certs/IOTVLANServices_bundle.pem");
const clientKey = fs.readFileSync("./certs/server.key");


const os = require('os');
const hostname = `${os.hostname()}`;

const options = {
  host: "10.123.84.36",
  port: 8883,
  ca: [caCert],
  cert: clientCert,
  key: clientKey,
  protocol: "mqtt",
  rejectUnauthorized: false,
  clientId: `client${hostname}ProxyKeyance${uuidv4()}`
};

const client = mqtt.connect(options);

let seq = 0;

function mqttpub(topic, message){
  const payload = {
    bn: "Proxy server",
    mid: uuidv4(),
    ts: new Date().toISOString(),
    md:{
        Plant: 'SUW',
        Area:  'Warehouse',
        Line: 'Proxy',
        DeviceID: hostname,
        seq: seq++,
    },
    ...message,
  };

  client.publish(topic, JSON.stringify(payload), { qos: 2, retain: true });
  //client.publish(topic, JSON.stringify(payload), { qos: 2 });
  seq = (seq + 1) % 10000;
}

module.exports = { mqttpub };
