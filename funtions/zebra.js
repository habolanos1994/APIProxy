const net = require('net');



const printerIP = '10.32.3.38';
const port = 9100;

// Create a socket connection to the printer
const client = new net.Socket();
client.connect(port, printerIP, () => {
    console.log('Connected to printer');
    
});

client.on('data', (data) => {
    console.log('Received: ' + data);
    client.destroy(); // kill client after server's response
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (error) => {
    console.error('Error: ' + error);
});



async function PrintLabel(serial) {

    const data = zplCommand(serial)

    client.write(data);
    
}

function zplCommand(serial) {

    const zplCommand = `
^XA
^FO50,50^ADN,36,20^FD${serial}^FS
^XZ
`;
    return zplCommand
}



module.exports = {PrintLabel}