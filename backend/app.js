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
const { addDropToQueue } = require('./drop/dropInsert');
const { ClanSettings, Clan } = require('../models')

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

    ws.on('message', async (message) => {
        const messageString = message.toString();

        try {
            const command = JSON.parse(messageString);
            await handleCommand(command, ws);
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

async function handleCommand(command, ws) {
    clients = getClients();
    switch (command.type) {
        case 'send_message':
            ws.send(`Command received: ${command.type}`);
            break;

        case 'add_drop':
            // Validate the SECRET_KEY
            if (command.secretKey !== process.env.SECRET_KEY) {
                ws.send(JSON.stringify({ error: 'Invalid secret key' }));
                return;
            }

            // Validate the drop data
            const { itemName, itemId, rsn, quantity, value, time, notified, imageUrl, npcName } = command.drop;
            if (!itemName || !itemId || !rsn || !quantity || !value || !time) {
                ws.send(JSON.stringify({ error: 'Missing drop data' }));
                return;
            }

            // Create the drop object
            const drop = {
                itemName,
                itemId,
                rsn,
                quantity,
                value,
                time: new Date(time),
                notified: notified || false,
                imageUrl: imageUrl || '',
                npcName: npcName || ''
            };

            // Add the drop to the queue
            addDropToQueue(drop);

            ws.send(JSON.stringify({ message: 'Processed drop successfully' }));
            break;

        case 'fetch_guild_config':
            if (command.secretKey !== process.env.SECRET_KEY) {
                ws.send(JSON.stringify({ error: 'Invalid secret key' }));
                return;
            }

            const { discordServerId } = command;
            console.log("Passed server id: " + discordServerId);
            if (!discordServerId) {
                ws.send(JSON.stringify({ error: 'discordServerId is required' }));
                return;
            }

            try {
                const clan = await Clan.findOne({
                    where: { discordServerId }
                });

                if (!clan) {
                    ws.send(JSON.stringify({ error: 'Clan not found' }));
                    return;
                }

                const clanSettings = await ClanSettings.findOne({
                    where: { clanId: clan.cid }
                });

                if (!clanSettings) {
                    ws.send(JSON.stringify({ error: 'Clan settings not found' }));
                    return;
                }

                ws.send(JSON.stringify(clanSettings)); // Send the settings as JSON
            } catch (error) {
                console.error('Error fetching clan config:', error);
                ws.send(JSON.stringify({ error: 'Internal server error' }));
            }
            break;

        default:
            console.log('Unknown command type:', command.type);
            ws.send(JSON.stringify({ error: 'Unknown command type' }));
    }
}
