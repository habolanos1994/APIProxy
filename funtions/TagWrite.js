const { Controller } = require('st-ethernet-ip');
const EventEmitter = require('events');

class PLCController extends EventEmitter {
  constructor(ipAddress, slot = 0) {
    super();
    this.PLC = new Controller({ timeout: 10000 });
    this.ipAddress = ipAddress;
    this.slot = slot;
    this.tags = {};
    this.isConnected = false;
    this.connectionCheckInterval = null;
  }

  async connect() {
    try {
      await this.PLC.connect(this.ipAddress, this.slot);
      console.log('Connected to PLC');
      this.isConnected = true;
      this.startConnectionCheck();
    } catch (error) {
      console.error('Failed to connect to PLC:', error);
      this.isConnected = false;
      setTimeout(() => this.connect(), 500); // Try to reconnect every 10 seconds
    }
  }

  startConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    this.connectionCheckInterval = setInterval(() => {
      if (!this.isConnected) {
        console.log('Connection lost. Attempting to reconnect...');
        this.connect();
      }
    }, 60000); // Check connection status every 60 seconds
  }

  addTags(tagConfig) {
    let validation = true;
    console.log(tagConfig);
  
    tagConfig.forEach(config => {
      try {
        if (!config.name || !config.scope) {
          throw new Error(`Invalid tag configuration: ${JSON.stringify(config)}`);
        }
        console.log(config);
        const tag = this.PLC.newTag(config.name, config.scope);
        this.tags[config.name] = tag;
      } catch (error) {
        console.error(`Failed to initialize tag ${config ? config.name : 'undefined'}:`, error);
        validation = false;
      }
    });
  
    this.emit('setup', validation);
  }

  async writeTag(tagName, value) {
    if (!this.tags[tagName]) {
      this.emit('error', `Tag ${tagName} has not been added. Please add it before writing.`);
      throw new Error(`Tag ${tagName} has not been added. Please add it before writing.`);

    }

    try {
      if (!this.isConnected) {
        console.log('PLC not connected. Attempting to reconnect...');
        await this.connect();
      }

      const tag = this.tags[tagName];

      this.emit('Previous value:', tagName, tag.value);
      
      await this.PLC.readTag(tag);
      //console.log(`Current value of ${tagName}: ${tag.value}`);
      
      this.emit('New value:', tagName, value);
      
      tag.value = value;
      await this.PLC.writeTag(tag);
      // console.log(`Successfully wrote ${value} to ${tagName}`);
    } catch (error) {
      this.emit('error', error);
      console.error(`Error writing to ${tagName}:`, error);
      this.isConnected = false; // Update connection status
      setTimeout(() => this.writeTag(tagName, value), 500); // Retry after 10 seconds
    }
  }

  stop() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    if (this.isConnected) {
      this.PLC.disconnect();
      this.isConnected = false;
    }
  }
}

module.exports = PLCController;
