const https = require('http');

async function makeApiCallSORTER(srl, locspur) {
  const options = {
    hostname: '10.63.192.201',
    port: 8081,
    path: `/SQL/SORTER?srl=${srl}&locspur=${locspur}&loc=ELP`,
    method: 'GET',
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (data.includes('Data inserted successfully!')) {
            resolve(data);
          } else {
            console.error(`API call failed: response does not contain 'success', input: (${srl}, ${locspur})`);
            reject(new Error(`API call failed: response does not contain 'success'`));
          }
        } else {
          console.error(`API call failed with status code ${res.statusCode}, input: (${srl}, ${locspur})`);
          reject(new Error(`API call failed with status code ${res.statusCode}`));
        }
      });
    });

    req.on('error', error => {
      console.error(`API call failed with error: ${error}, input: (${srl}, ${locspur})`);
      reject(error);
    });

    req.end();
  });
}


async function makeApiCallBOX(track, loc) {
    const options = {
      hostname: '10.63.192.201',
      port: 8081,
      path: `/SQL/BOX?track=${track}&loc=${loc}`,
      method: 'GET',
    };
  
    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let data = '';
  
        res.on('data', chunk => {
          data += chunk;
        });
  
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (data.includes('Data inserted successfully!')) {
              resolve(data);
            } else {
              console.error(`API call failed: response does not contain 'success', input: (${track}, ${loc})`);
              reject(new Error(`API call failed: response does not contain 'success'`));
            }
          } else {
            console.error(`API call failed with status code ${res.statusCode}, input: (${track}, ${loc})`);
            reject(new Error(`API call failed with status code ${res.statusCode}`));
          }
        });
      });
  
      req.on('error', error => {
        console.error(`API call failed with error: ${error}, input: (${track}, ${loc})`);
        reject(error);
      });
  
      req.end();
    });
  }

module.exports = {
    makeApiCallSORTER,
    makeApiCallBOX,
};