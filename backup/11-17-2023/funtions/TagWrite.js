const { Controller } = require('st-ethernet-ip');
const EventEmitter = require('events');

class PLCController extends EventEmitter {
  constructor(ipAddress, slot = 0) {
    super();
    this.PLC = new Controller({ timeout: 5000 });
    this.ipAddress = ipAddress;
    this.slot = slot;
    this.tags = {};
  }

  async connect() {
    try {
      await this.PLC.connect(this.ipAddress, this.slot);
      console.log('Connected to PLC');
    } catch (error) {
      console.error('Failed to connect to PLC:', error);
    }
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
      throw new Error(`Tag ${tagName} has not been added. Please add it before writing.`);
    }
    
    try {
      const tag = this.tags[tagName];
      
      // Emit the previous value before reading
      this.emit('Previus value:', tagName, tag.value);
      
      // Read the current value of the tag and wait for the operation to complete.
      await this.PLC.readTag(tag);
      console.log(`Current value of ${tagName}: ${tag.value}`);
      
      // Emit the new value before writing
      this.emit('new value:', tagName, value);
      
      // Now that the read operation has completed, write the new value to the tag.
      tag.value = value;
      await this.PLC.writeTag(tag);
      console.log(`Successfully wrote ${value} to ${tagName}`);
    } catch (error) {
      console.error(`Error writing to ${tagName}:`, error);
    }
  }
}

module.exports = PLCController;
