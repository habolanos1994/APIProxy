const express = require('express');
const app = express();
const os = require('os');
const hostname = os.hostname();
const ips = getIPs();
const port = 8883;


app.get('/', (req, res) => {
  res.send('Hello Keynes, how you bean?');
});


app.listen(port, () => {
  console.log(`Server running at ${hostname}:${port}`);
  console.log(`Server running at http://${ips}:${port}/`);
});

function getIPs() {
    const ips = [];
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
      for (const interface of interfaces[name]) {
        // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        if (interface.family === 'IPv4' && !interface.internal) {
          ips.push(interface.address);
        }
      }
    }
    return ips.length > 0 ? ips : 'No IPv4 address found!';
  }
