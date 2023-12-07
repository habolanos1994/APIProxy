const axios = require('axios');

const https = require('http');


const debugmode = false

async function APIPostCall(APImode, queryParams) {
  try {
    const response = await axios.post(APImode, queryParams, {
      httpsAgent: debugmode ? new https.Agent({ rejectUnauthorized: false }) : undefined,
      transformResponse: [function (data) {
        try {
          // Attempt to parse as JSON
          return JSON.parse(data);
        } catch (error) {
          // If error, it's plain text
          return data;
        }
      }],
    });
    return response;
  } catch (error) {

    console.error("Error in APIPostCall:", error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
    console.log(APImode);
    console.log(queryParams);
    throw error; // Rethrow the error for further handling
  }
}

async function APISpecialPostCall(APImode, queryParams) {
  try {
    // Construct the query string from the queryParams object
    const queryString = Object.keys(queryParams).map(key => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`;
    }).join('&');

    // Append the query string to the URL
    const urlWithQuery = `${APImode}?${queryString}`;

    // Make the POST request
    const response = await axios.post(urlWithQuery, {}, { // Sending an empty body with the request
      httpsAgent: debugmode ? new https.Agent({ rejectUnauthorized: false }) : undefined,
      transformResponse: [(data) => {
        try {
          return JSON.parse(data);
        } catch (error) {
          return data; // It's plain text or not JSON formatted
        }
      }],
    });

    return response;
  } catch (error) {
    console.error("Error in APISpecialPostCall:", error);
    throw error; // Rethrow the error for further handling
  }
}


async function APIGETCall(APImode, queryParams) {
  try {
    const response = await axios.get(APImode, {
      params: queryParams,
      httpsAgent: debugmode ? new https.Agent({ rejectUnauthorized: false }) : undefined,
      transformResponse: [function (data) {
        try {
          return JSON.parse(data);
        } catch (error) {
          return data;
        }
      }],
    });
    return response;
  } catch (error) {
    console.error("Error in APIGETCall:", error);
    throw error;
  }
}




async function GetPLCIDForEquipment(tnum, loc, srl, sensor, reqIP, APImode) {


  try {

    const queryParams = {
      tnum: tnum,
      loc: loc,
      srl: serialfix,
      sensor: sensor
    };

    response = await APIGETCall(APImode, queryParams)



    return response.data

  } catch (error) {


    return error
  }
}

async function GetPLCTNUMForEquipment(tnum, reqIP, APImode) {



  try {
    const queryParams = {
      tnum: tnum,
    };

    response = await APIGETCall(APImode, queryParams)



    return response.data
  } catch (error) {
    console.log(error);



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


    return response.data
  } catch (error) {
    console.log(error);


    const data = {
      Error: error,
      serial: track1,
      requester: reqIP,
    };


    return data
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


    return `Serial:${srl},Result:${code},Requester:${reqIP},Operation:GetDivertInfoForEquipment`

  } catch (error) {

    return `Serial:${srl},Result:${code},Requester:${reqIP},Operation:GetDivertInfoForEquipment`
  }
}

async function PostSerialForReceiving(loc, srl, reqIP, APImode) {

  const queryParams = {
    loc: loc,
    srl: srl,
  };

  try {
    response = await APIGETCall(APImode, queryParams)


    return response.data
  } catch (error) {
    console.log(error);


 
    return error
  }
}


async function DevicePakStation1(plcip, srl, APImode, delimiter = ',') {
  let serialArray;

  // Check if the serial string contains the specified delimiter
  if (srl.includes(delimiter)) {
      // Split the serial string into an array of serials
      serialArray = srl.split(delimiter);
  } else {
      // If the delimiter is not present, use the single serial number as a string
      serialArray = srl;
  }

  let queryParams;

  // If serialArray is actually an array and has more than one item, use it as an array
  if (Array.isArray(serialArray) && serialArray.length > 1) {
      queryParams = {
          ip: plcip,
          serial: [srl],
      };
  } else {
      // If serialArray is a single item, use it as a string
      queryParams = {
          ip: plcip,
          serial: serialArray instanceof Array ? serialArray[0] : serialArray,
      };
  }

  const response = await APIPostCall(APImode, queryParams);

  return response.data;
}



async function DevicePakStation2(plcip, srl, APImode, delimiter = ',') {
  let serialArray;

  // Check if the serial string contains the specified delimiter
  if (srl.includes(delimiter)) {
      // Split the serial string into an array of serials
      serialArray = srl.split(delimiter);
  } else {
      // If the delimiter is not present, use the single serial number as an array element
      serialArray = [srl];
  }

  const queryParams = {
      ip: plcip,
      serial: serialArray,
  };

  const response = await APIPostCall(APImode, queryParams);

  return response.data;
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
  GetDivertInfoForEquipment,
  DevicePakStation1,
  DevicePakStation2,
  GetSerialNumberByCAID
}
