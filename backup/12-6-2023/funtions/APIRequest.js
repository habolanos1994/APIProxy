const axios = require('axios');
const { mqttpub } = require("../funtions/mqttpublish");




async function APIGETCall(APImode, queryParams) {

  if (debugmode == true) {
    response = await axios.post(APImode, queryParams, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
  } else {
    response = await axios.post(APImode, queryParams);
  }

}


async function APIPostCall(APImode, queryParams) {

  if (debugmode == true) {
    response = await axios.GET(APImode, queryParams, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
  } else {
    response = await axios.GET(APImode, queryParams);
  }

}

async function SendToMQTT(data, operation, Datatype) {

  mqttpub(`SUW/Returns/PROXY/${operation}/${Datatype}`, data)

}


async function GetPLCIDForEquipment(tnum, loc, srl, sensor, reqIP, APImode) {


  const APIfuntion = 'Receiver_Sorter'

  try {

    const queryParams = {
      tnum: tnum,
      loc: loc,
      srl: serialfix,
      sensor: sensor
    };

    response = await APIGETCall(APImode, queryParams)

    let result = response.data;

    const data = {
      serial: srl,
      result: result.plc_route_value,
      requester: reqIP,
    };

    const json = JSON.stringify(data);

    SendToMQTT(data, APIfuntion, 'DDATA');

    return result

  } catch (error) {


    const data = {
      Error: error,
      serial: srl,
      requester: reqIP,
    };

    const json = JSON.stringify(data);

    SendToMQTT(data, APIfuntion, 'Error');
    return error
  }
}

async function GetPLCTNUMForEquipment(tnum, reqIP, APImode) {

  const APIfuntion = 'Heartbeat_Sorter';


  try {
    const queryParams = {
      tnum: tnum,
    };

    response = await APIGETCall(APImode, queryParams)

    let result = response.data;

    const data = {
      tnum: tnum,
      result: result.tnum,
      requester: reqIP,
    };

    const json = JSON.stringify(data);

    await SendToMQTT(data, APIfuntion, 'DDATA');

    return result
  } catch (error) {
    console.log(error);


    const data = {
      Error: error,
      tnum: tnum,
      requester: reqIP,
    };

    const json = JSON.stringify(data);

    SendToMQTT(data, APIfuntion, 'Error');
    return error
  }
}

async function GetPLCIDForTrackNum(loc, track1, reqIP, APImode) {


  const APIfuntion = 'Box_Clarify';

  try {

    const queryParams = {
      loc: loc,
      tracknum1: loc,
    };
    response = await APIGETCall(APImode, queryParams)
    let result = response.data;

    const data = {
      serial: track1,
      result: result.plc_route_value,
      requester: reqIP,
    };

    const json = JSON.stringify(data);

    await SendToMQTT(data, APIfuntion, 'DDATA');

    return result
  } catch (error) {
    console.log(error);


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

async function GetDivertInfoForEquipment(tnum, loc, srl, divertinfo, code, reqIP, APImode) {

  const APIfuntion = 'Sorter_Confirmation';


  try {

    const queryParams = {
      tnum: tnum,
      loc: loc,
      srl: srl,
      divertinfo: divertinfo,
      code: code
    };

    response = await APIGETCall(APImode, queryParams)

    const data = {
      serial: srl,
      result: code,
      requester: reqIP,
    };

    await SendToMQTT(data, APIfuntion, 'DDATA');

    return `Serial:${srl},Result:${code},Requester:${reqIP},Operation:GetDivertInfoForEquipment`

  } catch (error) {

    const data = {
      Error: error,
      serial: srl,
      requester: reqIP,
    };

    const json = JSON.stringify(data);
    SendToMQTT(data, APIfuntion, 'Error');

    return `Serial:${srl},Result:${code},Requester:${reqIP},Operation:GetDivertInfoForEquipment`
  }
}

async function PostSerialForReceiving(loc, srl, reqIP, APImode) {



  const APIfuntion = 'Sick_Clarify';


  const queryParams = {
    loc: loc,
    srl: srl,
  };



  try {
    response = await APIGETCall(APImode, queryParams)

    const data = {
      serial: srl,
      result: response.data,
      requester: reqIP,
    };


    await SendToMQTT(data, APIfuntion, 'DDATA');

    return response.data
  } catch (error) {
    console.log(error);


    const data = {
      Error: error,
      serial: srl,
      requester: reqIP,
    };

    const json = JSON.stringify(data);
    await SendToMQTT(data, APIfuntion, 'Error');
    return error
  }
}


async function DevicePakStation1(plcip, srl, APImode) {

  const serialfix = srl.match(regex) ? srl.slice(0, srl.search(regex)) : srl;


  const queryParams = {
    ip: plcip,
    serial: serialfix,
  };

  response = await APIPostCall(APImode, queryParams)


  return {
    success: true,
    data: response.data
  };
}


async function DevicePakStation2(plcip, srl, reqIP, APImode) {

  const serialfix = srl.match(regex) ? srl.slice(0, srl.search(regex)) : srl;


  const queryParams = {
    ip: plcip,
    serial: serialfix,
  };

  response = await APIPostCall(APImode, queryParams)


  return {
    success: true,
    data: response.data
  };
}

async function GetSerialNumberByCAID(CAID) {
  try {
    const response = await axios.post('https://mnet.global.dish.com/OracleProceduresAPI/api/Clarify/GetSerialNumberByCAID', {
      CAID: CAID
    });

    const data = response.data;

    // Check if the response contains 'SerialNumber'
    if (data && 'SerialNumber' in data) {
      return data.SerialNumber;
    } else {
      throw new Error('SerialNumber not found in the API response');
    }

  } catch (error) {
    console.error('Error fetching connection information:', error.message);
    throw error;
  }
}



module.exports = {
  GetPLCIDForEquipment,
  PostSerialForReceiving,
  GetPLCTNUMForEquipment,
  GetPLCIDForTrackNum,
  SendToMQTT,
  GetDivertInfoForEquipment,
  DevicePakStation1,
  DevicePakStation2,
  GetSerialNumberByCAID
}
