const fs = require('fs');

function updateMqttLog(jsonData) {
  // Read the existing data from mqttlog.json file
let existingData = {};
try {
  const fileData = fs.readFileSync('mqttlog.json', 'utf8');
  existingData = JSON.parse(fileData);
} catch (error) {
  console.error('Error reading or parsing mqttlog.json:', error);
  existingData = {};
}

  // Check if the requester key already exists
  if (existingData.hasOwnProperty(jsonData.requester)) {
    // Update the existing record with new data
    existingData[jsonData.requester] = jsonData;
  } else {
    // Add a new key with the requester and its data
    existingData[jsonData.requester] = jsonData;
  }

  // Write the updated data back to mqttlog.json file
  try {
    fs.writeFileSync('mqttlog.json', JSON.stringify(existingData));
    //console.log('mqttlog.json file updated successfully.');
  } catch (error) {
    console.error('Error writing to mqttlog.json:', error);
  }
}

module.exports = { updateMqttLog };

