require('dotenv').config();
const { WebSocketServer } = require('ws');
const { Sequelize, Op } = require('sequelize');
const { sendMessageToAllClients, sendMessageToLocalClients } = require('./websocketMessageAll');
const { addClient, removeClient, getClients } = require('./websocketClients');
const { addDropToQueue } = require('../drop/dropInsert');
const { rankLoot, GetAllClansAndCache } = require('../utils/rankAllLoot');
const { GetClanTotal, calculateTotalLootFromCache } = require('./getClanTotal');
const { User, Clan, ClanSettings, Drop, DropTotal, Log, NewsPost, Notification, DiscordEmbed, RSAccount, ClanMembers } = require('../../models');
const { ensureSheetExists, insertData } = require('../google/GoogleSheets');
const axios = require('axios');
const { sendNewAccountMessage, sendNameChangeMessage, sendDiscordLootMessage, sendDiscordCollectionLogMessage, sendDiscordCombatAchievementMessage, sendDiscordLootboardMessage } = require('../discord/sendDiscordMessage');
const { WOMClient } = require('@wise-old-man/utils');
const { rateLimitedWomClientCall } = require('../wom/wom');
const { client, updateRedisCache, addDropToRecentCache } = require('../redis/redisClient');

let clients = getClients();


const womclient = new WOMClient({
  authKey: process.env.WOM_API_KEY,
  userAgent: '@joelhalen -droptracker.io'
});


function initializeWebSocket(server) {
    const wss = new WebSocketServer({
        server,
        clientTracking: true,
        perMessageDeflate: {
            zlibDeflateOptions: {
                chunkSize: 1024,
                memLevel: 7,
                level: 3
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024
            },
            clientNoContextTakeover: true,
            serverNoContextTakeover: true,
            serverMaxWindowBits: 10,
            concurrencyLimit: 10,
            threshold: 1024
        },
        timeout: 60000 // Extend the timeout duration to 60 seconds
    });
    

    wss.on('connection', (ws, req) => {
        clients = getClients();
        const ip = req.socket.remoteAddress;
        addClient(ws, ip);
        console.log('New WebSocket connection established from IP:', ip);

        ws.on('message', async (message) => {
            const messageString = message.toString();

            try {
                const commands = JSON.parse(messageString);
                if (Array.isArray(commands)) {
                    for (const command of commands) {
                        await handleCommand(command, ws);
                    }
                } else {
                    await handleCommand(commands, ws);
                }
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

        ws.on('pong', () => {
            ws.isAlive = true; // Mark connection as alive on pong
        });

        ws.isAlive = true;
        ws.on('pong', () => (ws.isAlive = true)); // Set the connection as alive on pong response

        const interval = setInterval(() => {
            wss.clients.forEach((ws) => {
                if (!ws.isAlive) return ws.terminate(); // Terminate if not alive
                ws.isAlive = false;
                ws.ping(); // Send a ping to check if the connection is alive
            });
        }, 30000); // Check every 30 seconds

        ws.on('close', () => clearInterval(interval)); // Clear interval on close

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    wss.on('error', (error) => {
        console.error('WebSocket server error:', error);
    });
}

async function handleCommand(command, ws) {
    //await GetAllClansAndCache();
    clients = getClients();
    switch (command.type) {
        case 'send_message':
            ws.send(`Command received: ${command.type}`);
            break;

        case 'add_drop':
            await processDrop(command.drop, ws, command.secretKey);
            break;

        case 'add_collection':
            await processCollection(command.data, ws, command.secretKey);
            break;

        case 'add_achievement':
            // TODO 
            break;

        case 'add_pb':
            // TODO
            break;

        case 'fetch_guild_config':
            if (command.secretKey !== process.env.SECRET_KEY) {
                ws.send(JSON.stringify({ error: 'Invalid secret key ', provided: command.secretKey, expected: process.env.SECRET_KEY }));
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

                ws.send(JSON.stringify(clanSettings));
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

async function processCollection(collection, ws, secretKey) {
    if (secretKey !== process.env.SECRET_KEY) {
        ws.send(JSON.stringify({ error: 'Invalid secret key' }));
        return;
    }

    const { itemName, itemId, rsn, npcName, imageUrl } = collection;

    const rsAcc = await RSAccount.findOne({ where: { displayName: rsn } });
    if (!rsAcc) {
        let player = await rateLimitedWomClientCall(womclient.players.getPlayerDetails, rsn).catch(async error => {
                console.log('Player not found, attempting to update:', rsn);
                return await rateLimitedWomClientCall(womclient.players.updatePlayer, rsn).catch(err => {
                    console.error('Error updating player:', err);
                    return null;
                });
            });
            if(!player) {
                ws.send(JSON.stringify({ error: 'User not found' }));
                return;
            } else {
                rsAcc = player;
            }
        return;
    }

    const user = await User.findOne({ where: { uid: rsAcc.userId } });
    if (!user) {
        ws.send(JSON.stringify({ error: 'User not found' }));
        return;
    }

    const clan = await Clan.findOne({ where: { cid: user.clanId } });
    if (!clan) {
        ws.send(JSON.stringify({ error: 'Clan not found' }));
        return;
    }

    const clanSettings = await ClanSettings.findOne({ where: { clanId: clan.cid } });
    if (!clanSettings) {
        ws.send(JSON.stringify({ error: 'Clan settings not found' }));
        return;
    }

    if (!clanSettings.settings.send_notifications_for_new_collection_logs) {
        ws.send(JSON.stringify({ message: 'Notifications for new collection logs are disabled' }));
        return;
    }

    const defaultEmbed = await DiscordEmbed.findOne({
        where: {
            clanId: clan.cid,
            type_id: 3
        }
    });

    const guildId = clan.discordServerId;
    const channelId = clanSettings.settings.channel_id_to_post_loot;
    const drop = {
        itemName,
        itemId,
        rsn,
        kc: collection.kc || 0,
        sourceName: npcName || '',
        itemRarity: collection.rarity || '',
        imageUrl: imageUrl || ''
    };

    await sendDiscordCollectionLogMessage(guildId, channelId, drop, defaultEmbed.embedData, defaultEmbed.content);

}

async function handleDropRequest(dropData, secretKey, ws = null) {
    // console.log("handleDropRequest");
    // console.log("dropData:", JSON.stringify(dropData, null, 2)); // Pretty-print dropData
    return await processDrop(dropData, ws, secretKey);
}

async function processDrop(drop, ws, secretKey) {
  if (secretKey !== process.env.SECRET_KEY) {
    ws.send(JSON.stringify({ error: 'Invalid secret key' }));
    console.log("Drop denied for invalid key.");
    return;
  }

  const { itemName, itemId, rsn, quantity, value, time, notified, imageUrl, npcName, sheetUrl, token } = drop;
  if (!itemName || itemId === undefined || !rsn || quantity === undefined || value === undefined || !time) {
    ws.send(JSON.stringify({ error: 'Missing drop data' }));
    return;
  }


  let womId = 0;
  let clanId = '';
  let userDiscordId = 0;

  const rsAcc = await RSAccount.findOne({
    where: {
      [Op.or]: [
        { displayName: rsn }
      ]
    }
  });
    let rsAccount;
  if (rsAcc) { // if the user has an account in the database
      if (rsn === "joelhalen") {
          console.log("Drop by joelhalen")
      }
    womId = rsAcc.womId;
      // console.log("Found rs account with womId " + womId);

    if (rsAcc.userId) {
        // if they are registered with a user on discord
      const user = await User.findOne({ where: { uid: rsAcc.userId } });

      if (user) {
          //if the userid exists for which they registered to
          if (user.clanId) {
              //if they have a clanid
              clanId = user.clanId;
              const womClan = await Clan.findOne({ where: { cid: clanId } });

              if (womClan) {
                  user.clanId = womClan.cid;
                  await user.save();
                  clanId = womClan.cid;
              }
          }
          if (rsn === "joelhalen") {
              console.log("Clan id after user check is " + clanId);
          }
      }
        } else {
            // if no user is associated with the rsAccount entry
          const clanMember = await ClanMembers.findOne({ where: { displayName: rsAcc.displayName } });
          if (clanMember) {
            const womClan = await Clan.findOne({ where: { womClanId: clanMember.clanId } });
            if (womClan) {
              clanId = womClan.cid;
            }
          }
        }
  } else {
      console.log("No rs account");
      const existingClanMember = await ClanMembers.findOne({
          where: {
              displayName: rsn
          }
      });
      if (existingClanMember) {
          rsAccount = await RSAccount.create({
              displayName: rsn,
              womId: existingClanMember.playerId
          });
          const clanOb = await Clan.findOne({
              where: {
                  clanId: existingClanMember.clanId
              }
          });
          if (clanOb) {
              clanId = clanOb.cid;
          } else {
              clanId = '';
          }
      } else {
          let player = await rateLimitedWomClientCall(womclient.players.getPlayerDetails, rsn).catch(async error => {
              console.log('Player not found, attempting to update:', rsn);
              return await rateLimitedWomClientCall(womclient.players.updatePlayer, rsn).catch(err => {
                  console.error('Error updating player:', err);
                  return null;
              });
          });
          if (!player) {
              console.log('Player could not be found or updated');
              return;
          }
          rsAccount = await RSAccount.findOne({
              where: {
                  womId: player.id
              }
          });
          if (rsAccount) {
              const oldRsn = rsAccount.displayName;
              // Update the existing account's displayName
              rsAccount.displayName = rsn;
              await rsAccount.save(); // Save the changes
              womId = rsAccount.womId;
              console.log(`Updated RSAccount displayName to ${rsn} for womId ${womId}`);
              await updateRsnForDrops(oldRsn, rsn);
          } else {
              const rsAccount = await RSAccount.create({
                  displayName: rsn,
                  womId: player.id
              });
              womId = player.id;
              console.log(`Created new RSAccount with displayName ${rsn} and womId ${womId}`);
              // await sendNewAccountMessage(rsn, womId);

          }
      }

    
  }

  if (clanId !== '') {
      if (rsn === "joelhalen") {
          console.log("Clan id is " + clanId);
      }
    const rawClanSettings = await ClanSettings.findOne({ where: { clanId: clanId } });
    const clanSettings = JSON.parse(rawClanSettings.settings);
    // console.log("Player has a clanID it is" + clanId);
    if (clanSettings) {
      const minDropValue = parseInt(clanSettings.minimum_value_to_send_drop);
      const onlyScreenshots = clanSettings.only_send_drops_with_images;
      //console.log("Only screenshots? " + onlyScreenshots);
      const sendItemStacks = clanSettings.only_send_drops_with_one_item;
      if (onlyScreenshots && !imageUrl) {
          // console.log("Only screenshots & no image");
        return;
      }
      //console.log("Image url is:" + imageUrl);
      // console.log("Min drop value is" + minDropValue);
      if ((parseInt(value)) > minDropValue) {
          //console.log("Value exceeds min")
        const clan = await Clan.findOne({ where: { cid: clanId } });
        const discordServerId = `${clan.discordServerId}`;
        const clanName = clan.displayName;
        const clanLootData = await GetClanTotal({ discordServerId: discordServerId });
        let totalLoot = 0;
        if (clanLootData) {
          totalLoot = clanLootData.totalLoot;
        }
        const targetChannel = clanSettings.channel_id_to_post_loot;
        let defaultEmbed = await DiscordEmbed.findOne({ where: { clanId: clan.cid, type_id: 2 } });

        const content = defaultEmbed.content;
        console.log("Got content for the embed:" + content);
        defaultEmbed = JSON.parse(defaultEmbed.embedData);
        console.log("Sending message with parsed embed:" + defaultEmbed);

        await sendDiscordLootMessage(discordServerId, targetChannel, drop, defaultEmbed, content);
      }
    }
  } 
const userTotalLoot = await calculateTotalLootFromCache([rsn], { startTime: new Date('1970-01-01'), endTime: new Date() });
if ((value) > 5000000) {
    const targetChannel = "1267605788445245521";
    const defaultEmbed = await DiscordEmbed.findOne({ where: { clanId: 10, type_id: 2 } });
    const content = defaultEmbed.content;
    await sendDiscordLootMessage("1172737525069135962", targetChannel, drop, defaultEmbed.embedData, defaultEmbed.content);
    console.log("Global embed should be sent for this drop");
}
  

  const dropData = {
    itemName,
    itemId,
    rsn,
    quantity,
    value,
    time: new Date(time),
    notified: true,
    imageUrl: imageUrl || '',
    npcName: npcName || ''
  };

  const valuesArray = [
    [
      dropData.rsn,
      womId,
      dropData.itemName,
      dropData.itemId,
      dropData.npcName,
      dropData.quantity,
      dropData.value,
      clanId,
      dropData.imageUrl,
      dropData.time.toISOString()
    ]
  ];

  if (sheetUrl) {
    try {
      let spreadsheetId;
      if (sheetUrl.includes('/')) {
        spreadsheetId = sheetUrl.split('/d/')[1].split('/')[0];
      } else {
        spreadsheetId = sheetUrl;
      }

      await ensureSheetExists(spreadsheetId);
      await insertData(spreadsheetId, 'drops!A2', valuesArray);

      ws.send(JSON.stringify({ message: 'Data inserted successfully' }));
    } catch (error) {
      // console.error('Error inserting data:', error);
      // ws.send(JSON.stringify({ error: 'Error inserting data' }));
    }
  }

  await updateRedisCache(rsn, value * quantity, npcName); 
  if (value > 5000000) {
      await addDropToRecentCache({
        itemId,
        rsn,
        itemName,
        npcName,
        time: new Date(time),
        total_value: value * quantity,
        total_quantity_month: quantity,
        total_quantity_all_time: await Drop.sum('quantity', { where: { itemId } })
      });
        }
  addDropToQueue(dropData);
  ws.send(JSON.stringify({ type: 'message', message: 'Processed drop successfully' }));
}


const updateRsnForDrops = async (oldRsn, newRsn) => {
    const drops = await Drop.findAll({
        where: {
            rsn: oldRsn
        }
    });

    for (const drop of drops) {
        drop.rsn = newRsn;
        await drop.save(); // Save the changes
    }
};

const updateRsAccountAndDrops = async (player, rsn) => {
    const rsAccount = await RSAccount.findOne({
        where: {
            womId: player.id
        }
    });

    if (rsAccount) {
        const oldRsn = rsAccount.displayName;
        // Update the existing account's displayName
        rsAccount.displayName = rsn;
        await rsAccount.save(); // Save the changes
        const womId = rsAccount.womId;
        console.log(`Updated RSAccount displayName to ${rsn} for womId ${womId}`);

        await sendNameChangeMessage(oldRsn, rsn, womId);

        // Update RSN in the drops table
        await updateRsnForDrops(oldRsn, rsn);
        console.log(`Updated RSN in Drops from ${oldRsn} to ${rsn}`);
    }
};


module.exports = {
    initializeWebSocket,
    handleCommand,
    handleDropRequest
};