require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { restrictToLocalhost } = require('./utils/middleware');
const publicRoutes = require('./public/publicRoutes');
const { WebSocketServer } = require('ws');
const { sendMessageToAllClients } = require('./utils/websocketMessageAll');
const { addClient, removeClient, getClients } = require('./utils/websocketClients'); // Import the client management functions
const axios = require('axios'); // Add this line

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/', publicRoutes);
app.use('/private', restrictToLocalhost);

const PORT = process.env.BACKEND_LISTEN_PORT || 21220;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });
let clients = getClients();
wss.on('connection', (ws, req) => {
  clients = getClients();
  const ip = ws._socket.remoteAddress;
  addClient(ws, ip); // Add client with IP
  console.log('New WebSocket connection established from IP:', ip);

  ws.on('message', (message) => {
    const messageString = message.toString();

    try {
      const command = JSON.parse(messageString);
      handleCommand(command, ws);
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send('Error: Invalid JSON');
    }
  });

  ws.on('close', () => {
    clients = getClients();
    removeClient(ws); 
    console.log('WebSocket connection closed from IP:', ip);
  });
});

function handleCommand(command, ws) {
  clients = getClients();
  switch (command.type) {
    case 'send_message':
      ws.send(`Command received: ${command.type}`);
      break;
    default:
      console.log('Unknown command type:', command.type);
      ws.send('Error: Unknown command type');
  }
}
