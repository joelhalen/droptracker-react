const clients = new Set();

const addClient = (client, ip) => {
  clients.add({ client, ip });
};

const removeClient = (client) => {
  clients.forEach((entry) => {
    if (entry.client === client) {
      clients.delete(entry);
    }
  });
};

const getClients = () => {
  return clients;
};

module.exports = {
  addClient,
  removeClient,
  getClients
};
