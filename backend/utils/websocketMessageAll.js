const { getClients } = require('./websocketClients');
const WebSocket = require('ws'); // Import WebSocket from the ws module

const sendMessageToAllClients = (type, targetChannel, targetUser, content, embed) => {
  console.log("CALLING SENDMESSAGETOALLCLIENTS");
  const message = {
    type: type,
    targetChannel: targetChannel,
    targetUser: targetUser,
    content: content,
    embed: embed
  };
  const messageString = JSON.stringify(message);

  const clients = getClients(); 
  clients.forEach(({ client }) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
};

const sendMessageToLocalClients = (type, targetChannel, targetUser, content, embed) => {
  console.log("CALLING SENDMESSAGETOLOCALCLIENTS");
  const message = {
    type: type,
    targetChannel: targetChannel,
    targetUser: targetUser,
    content: content,
    embed: embed
  };
  const messageString = JSON.stringify(message);

  const clients = getClients(); 
  clients.forEach(({ client, ip }) => {
    if (client.readyState === WebSocket.OPEN && (ip === '127.0.0.1' || ip === '::1')) {
      client.send(messageString);
    }
  });
};

module.exports = {
  sendMessageToAllClients,
  sendMessageToLocalClients,
};
