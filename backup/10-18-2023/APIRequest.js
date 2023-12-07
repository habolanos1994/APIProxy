const axios = require('axios');
const express = require("express");
const { mqttpub } = require("./mqttpublish")
const os = require('os');
const { logError } = require("./errorlog")
const fs = require('fs');


let lastSerialNumber = null; // variable to store the last serial number
const hostname = os.hostname();



function setHeaders(res) {
  res.setHeader('Content-Type', 'application/json');
}

async function SendToMQTT(data, operation, Datatype) {

 mqttpub(`ELP/Returns/PROXY/${operation}/${Datatype}`, data)

  }


  async function GetPLCIDForEquipment(tnum, loc, srl, sensor, res, reqIP) {

  // Read JSON file and parse it to get an object
  const configFile = fs.readFileSync('./APIMode.json');
  const config = JSON.parse(configFile);

  // Get the WebAPI value
  let APImode = config.ActiveAPI.WebAPI;

    const APIfuntion = 'Receiver_Sorter'

    var urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/GetPLCIDForEquipment?tnum=${tnum}&loc=ELP&srl=${srl}&sensor=${sensor}`;
  
    try {
      let response = await axios.get(urlApi);
      let result = response.data;
  
      setHeaders(res);
      res.send(result);
  
      const data = {
        serial: srl,
        result: result.plc_route_value,
        requester: reqIP,
      };
  
      const json = JSON.stringify(data);
  
      SendToMQTT(data,APIfuntion,'DDATA');
      
    } catch (error) {
      console.log(error);
      logError(error);
  
      const data = {
        Error: error,
        serial: srl,
        requester: reqIP,
      };
  
      const json = JSON.stringify(data);
  
      SendToMQTT(data,APIfuntion,'Error');
      res.send(error);
    }
  }

  async function GetPLCTNUMForEquipment(tnum , res, reqIP) {

  // Read JSON file and parse it to get an object
  const configFile = fs.readFileSync('./APIMode.json');
  const config = JSON.parse(configFile);

  // Get the WebAPI value
  let APImode = config.ActiveAPI.WebAPI;

    const APIfuntion = 'Heartbeat_Sorter';
    var urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/GetPLCIDForEquipment?tnum=${tnum}`;
  
    try {
      let response = await axios.get(urlApi);
      let result = response.data;
  
      setHeaders(res);
      res.send(result);
  
      const data = {
        tnum: tnum,
        result: result.tnum,
        requester: reqIP,
      };
  
      const json = JSON.stringify(data);
  
      SendToMQTT(data, APIfuntion, 'DDATA');
    } catch (error) {
      console.log(error);
      logError(error);
  
      const data = {
        Error: error,
        tnum: tnum,
        requester: reqIP,
      };
  
      const json = JSON.stringify(data);
  
      SendToMQTT(data, APIfuntion, 'Error');
      res.send(error);
    }
  }

  async function GetPLCIDForTrackNum(loc, track1, track2, track3, track4, track5, res, reqIP) {

  // Read JSON file and parse it to get an object
  const configFile = fs.readFileSync('./APIMode.json');
  const config = JSON.parse(configFile);

  // Get the WebAPI value
  let APImode = config.ActiveAPI.WebAPI;

    const APIfuntion = 'Box_Clarify';
    var urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/GetPLCIDForTrackNum?loc=ELP&tracknum1=${track1}&tracknum2=${track2}&tracknum3=${track3}&tracknum4=${track4}&tracknum5=${track5}`;
  
    try {
      let response = await axios.get(urlApi);
      let result = response.data;
  
      setHeaders(res);
      res.send(result);
  
      const data = {
        serial: track1,
        result: result.plc_route_value,
        requester: reqIP,
      };
  
      const json = JSON.stringify(data);
  
      SendToMQTT(data, APIfuntion, 'DDATA');
    } catch (error) {
      console.log(error);
      logError(error);
  
      const data = {
        Error: error,
        serial: track1,
        requester: reqIP,
      };
  
      const json = JSON.stringify(data);
  
      SendToMQTT(data, APIfuntion, 'Error');
      res.send(error);
    }
  }

  async function GetDivertInfoForEquipment(tnum, loc, srl, divertinfo, code, res, reqIP) {

  // Read JSON file and parse it to get an object
  const configFile = fs.readFileSync('./APIMode.json');
  const config = JSON.parse(configFile);

  // Get the WebAPI value
  let APImode = config.ActiveAPI.WebAPI;

    const APIfuntion = 'Sorter_Confirmation';
    var urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/GetDivertInfoForEquipment?tnum=${tnum}&loc=${loc}&srl=${srl}&divertinfo=${divertinfo}&code=${code}`;
    console.log(urlApi);
  
    try {
      let response = await axios.get(urlApi);
  
      const data = {
        serial: srl,
        result: code,
        requester: reqIP,
      };
  
      SendToMQTT(data, APIfuntion, 'DDATA');
      lastSerialNumber = srl; 
      res.send(`Serial:${srl},Result:${code},Requester:${reqIP},Operation:GetDivertInfoForEquipment`);
    } catch (error) {
      console.log(error);
      logError(error);
  
      const data = {
        Error: error,
        serial: srl,
        requester: reqIP,
      };
      
      const json = JSON.stringify(data);
      SendToMQTT(data, APIfuntion, 'Error');
      res.send(error);
    }
  }

  async function PostSerialForReceiving(loc, srl, res, reqIP) {

  // Read JSON file and parse it to get an object
  const configFile = fs.readFileSync('./APIMode.json');
  const config = JSON.parse(configFile);

  // Get the WebAPI value
  let APImode = config.ActiveAPI.WebAPI;

    const APIfuntion = 'Sick_Clarify';
    var urlApi = `${APImode}Programs_NET_2/RCVX/api/RCV/PostSerialForReceiving?loc=ELP&srl=${srl}`;
  
    try {
      let response = await axios.get(urlApi);
      
      const data = {
        serial: srl,
        result: response.data,
        requester: reqIP,
      };
  
      setHeaders(res);
      res.send(response.data);
      SendToMQTT(data, APIfuntion, 'DDATA');
    } catch (error) {
      console.log(error);
      logError(error);
      
      const data = {
        Error: error,
        serial: srl,
        requester: reqIP,
      };
  
      const json = JSON.stringify(data);
      SendToMQTT(data, APIfuntion, 'Error');
      res.send(error);
    }
  }

module.exports = { GetPLCIDForEquipment,
                   PostSerialForReceiving,
                   GetPLCTNUMForEquipment,
                   GetPLCIDForTrackNum,
                   SendToMQTT,
                   GetDivertInfoForEquipment
                   }
