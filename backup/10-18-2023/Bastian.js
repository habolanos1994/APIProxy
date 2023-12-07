const express = require("express");
const { GetDivertInfoForEquipment ,GetPLCIDForEquipment, PostSerialForReceiving, GetPLCTNUMForEquipment, GetPLCIDForTrackNum, SendToMQTT } = require("./APIRequest");
const { logError } = require("./errorlog")
const os = require('os');
const hostname = os.hostname();

const app = express();
const port = 8080;

const fs = require('fs');
const path = require("path");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get("/a", (_, res) => {
  res.json({ message: "ok" });
});

app.get("/Programs_NET_2/RCVX/api/RCV/GetPLCIDForEquipment", async (req, res) => {
  if ('tnum' in req.query && !('srl' in req.query)) {
    GetPLCTNUMForEquipment(req.query.tnum, res, req.ip);
  } else {
    GetPLCIDForEquipment(req.query.tnum, req.query.loc, req.query.srl, req.query.sensor, res, req.ip);
  }
});

app.get("/Programs_NET_2/RCVX/api/RCV/GetPLCIDForTrackNum", async (req, res) => {
  GetPLCIDForTrackNum(
    req.query.loc,
    req.query.tracknum1,
    req.query.tracknum2,
    req.query.tracknum3,
    req.query.tracknum4,
    req.query.tracknum5,
    res,
    req.ip
  );
});

app.get("/Programs_NET_2/RCVX/api/RCV/GetDivertInfoForEquipment", async (req, res) => {

//console.log(req.query)
        GetDivertInfoForEquipment(
        req.query.tnum,
        req.query.loc,
        req.query.srl,
        req.query.divertinfo,
        req.query.code,
        res,
        req.ip)

});

app.get("/hearthbeat", (_, res) => {
  res.send("online");
});

app.get("/Programs_NET_2/RCVX/api/RCV/PostSerialForReceiving", (req, res) => {
  if ('loc' in req.query && 'srl' in req.query) {
    PostSerialForReceiving(req.query.loc, req.query.srl, res, req.ip);
  } else {
    res.json({ message: "Query Fail please follow the query: loc: 'string', srl: 'string'" });
  }
});

app.use((req, res) => {
  res.status(404).send('Cannot GET /');
  SendToMQTT(`errorApiNotFound:${req.originalUrl},Requestor:${req.ip}`)
  logError(`errorApiNotFound:${req.originalUrl},Requestor:${req.ip}`)
});

// Log the error message
app.use((err, req, res, next) => {
  logError(`Error: ${err.message}`)
  console.error(`Error: ${err.message}`);
  next(err);
});

app.listen(port, () => {
  console.log(`Server started: ${hostname}:${port}`);
});

