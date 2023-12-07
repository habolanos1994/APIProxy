const path = require('path');
const os = require('os');

module.exports = {
  port: 80,
  sourcefile: path.basename(__filename),
  hostname: os.hostname()
};
