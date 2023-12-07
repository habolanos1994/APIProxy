const PLCController = require('./funtions/TagWrite');

const plcController = new PLCController('10.32.192.82');
plcController.connect().then(() => {
  // Add tags
  const tagConfig = [
    {
      name: "LastManualScan",
      type: "STRING",
      scope: "TrafficControl"
    },
    {
      name: "ManualScannerHeartbeat",
      type: "BOOL",
      scope: "TrafficControl"
    }
  ];
  plcController.addTags(tagConfig);

  // Write to a tag
  plcController.writeTag('LastManualScan', 'test');
  plcController.writeTag('ManualScannerHeartbeat', false);
});

// Listen for emissions
plcController.on('Previus value:', (tagName, value) => {
  console.log(`Previous value of ${tagName}:`, value);
});

plcController.on('new value:', (tagName, value) => {
  console.log(`Writing new value to ${tagName}:`, value);
});
