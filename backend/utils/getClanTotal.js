const db = require('../../models');
const { Clan, User, Drop, RSAccount, ClanMembers } = db;
const { Sequelize } = require('sequelize');
const { womclient, rateLimitedWomClientCall } = require('../wom/wom');
const { client } = require('../redis/redisClient'); 

const getCacheKey = (rsn, npcName, timeframe) => {
  return JSON.stringify({ rsn, npcName, timeframe });
};

const trackedNPCs = ['Chambers of Xeric',
  'Theatre of Blood', 'Tombs of Amascut',
  'Phantom Muspah', 'Zulrah', 'Vorkath', 'Leviathan',
  'Vardorvis', 'The Whisperer', 'Duke Sucellus',
  'Alchemical Hydra', 'General Graardor', 'Commander Zilyana',
  "K'ril Tsutsaroth", "Kree'arra", "The Gauntlet", 'The Corrupted Gauntlet',
  "Clue scroll (master)", "Clue scroll (easy)", "Clue scroll (medium)", "Clue scroll (elite)",
  'Barrows', 'Corporeal Beast'];



const calculateTotalLootFromCache = async (rsns, timeframe) => {
  const timeframeLabel = getTimeframeLabel(timeframe);

  const lootPromises = rsns.map(async (rsn) => {
    const lootDataPromises = trackedNPCs.map(async (npcName) => {
      const cacheKey = getCacheKey(rsn, npcName, timeframeLabel);
      const cachedData = await client.get(cacheKey);
      return cachedData ? JSON.parse(cachedData).totalLoot : 0;
    });

    const totalLoot = (await Promise.all(lootDataPromises)).reduce((acc, val) => acc + val, 0);
    return totalLoot;
  });

  const totalLoot = (await Promise.all(lootPromises)).reduce((acc, val) => acc + val, 0);
  return totalLoot;
};

const calculateGlobalRankingFromCache = async (rsns, timeframe) => {
  const timeframeLabel = getTimeframeLabel(timeframe);

  const lootPromises = rsns.map(async (rsn) => {
    const lootDataPromises = trackedNPCs.map(async (npcName) => {
      const cacheKey = getCacheKey(rsn, npcName, timeframeLabel);
      const cachedData = await client.get(cacheKey);
      return cachedData ? JSON.parse(cachedData).totalLoot : 0;
    });

    const totalLoot = (await Promise.all(lootDataPromises)).reduce((acc, val) => acc + val, 0);
    return { rsn, totalLoot };
  });

  const lootResults = await Promise.all(lootPromises);
  lootResults.sort((a, b) => b.totalLoot - a.totalLoot);

  return lootResults;
};

const calculateClanRankingFromCache = async (clanId, rsns, timeframe) => {
  const timeframeLabel = getTimeframeLabel(timeframe);

  const clanMembers = await ClanMembers.findAll({ 
    where: {
        clanId: clanId
    }
  });

  const clanMemberNames = clanMembers.map(member => member.displayName);

  const lootPromises = clanMemberNames.map(async (rsn) => {
    const lootDataPromises = trackedNPCs.map(async (npcName) => {
      const cacheKey = getCacheKey(rsn, npcName, timeframeLabel);
      const cachedData = await client.get(cacheKey);
      return cachedData ? JSON.parse(cachedData).totalLoot : 0;
    });

    const totalLoot = (await Promise.all(lootDataPromises)).reduce((acc, val) => acc + val, 0);
    return { rsn, totalLoot };
  });

  const lootResults = await Promise.all(lootPromises);
  lootResults.sort((a, b) => b.totalLoot - a.totalLoot);

  return lootResults;
};

const getTimeframeLabel = (timeframe) => {
  const { startTime, endTime } = timeframe;
  const start = `${startTime.getFullYear()}-${startTime.getMonth() + 1}`;
  const end = `${endTime.getFullYear()}-${endTime.getMonth() + 1}`;
  return `${start}-${end}`;
};

const getAllItems = async (identifiers, timeframe) => {
  const { clanId, userId } = identifiers;
  const { startTime, endTime } = timeframe;

  console.log("Called getAllItems with clanId:", clanId, "and userId:", userId);

  try {
    const cacheKey = getCacheKey(identifiers, timeframe);

    // Check if the response is in Redis cache
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log('Returning cached response from Redis');
      return JSON.parse(cachedData);
    }

    let rsns = [];
    const RSN_BATCH_SIZE = 2500;
    let offset = 0;

    // Function to process dropsBatch
    const processDropsBatch = (dropsBatch, dropsList, playerTotals, recentDrops, totalLoot) => {
      for (const drop of dropsBatch) {
        const itemName = drop.itemName.toLowerCase().trim();
        const playerName = drop.rsn;
        const quantity = Number(drop.get('total_quantity'));
        const value = Number(drop.get('total_value'));
        const totalValue = value;
        const dateTime = drop.time;
        const itemId = drop.itemId;

        totalLoot += totalValue;

        if (!dropsList[itemName]) {
          dropsList[itemName] = { count: 0, total_value: 0, id: drop.itemId };
        }

        dropsList[itemName].count += quantity;
        dropsList[itemName].total_value += totalValue;

        if (!playerTotals[playerName]) {
          playerTotals[playerName] = 0;
        }
        playerTotals[playerName] += totalValue;

        // Only include drops in recentDrops if totalValue > 500,000 and quantity == 1
        // if (totalValue > 500000 && quantity === 1) {
          // console.log(`Adding to recentDrops: itemName=${itemName}, itemId=${itemId}, playerName=${playerName}, dateTime=${dateTime}, totalValue=${totalValue}, quantity=${quantity}`);
          recentDrops.push({
            itemName,
            itemId,
            playerName,
            dateTime,
            totalValue,
            quantity
          });
        // }
      }
    };

    if (clanId !== undefined) {
      if (clanId === 0) {
        // Fetch all drops without filtering by player names
        const dropsList = {};
        const playerTotals = {};
        const recentDrops = [];
        const BATCH_SIZE = 375000;
        let totalLoot = 0;
        offset = 0;

        // Fetch drops data with pagination
        let dropsBatch;
        do {
          dropsBatch = await Drop.findAll({
            where: {
              time: {
                [Sequelize.Op.between]: [startTime, endTime]
              }
            },
            attributes: [
              'itemId',
              'rsn',
              'itemName',
              'npcName',
              'time',
              [Sequelize.fn('SUM', Sequelize.literal('COALESCE(`value`, 0) * COALESCE(`quantity`, 0)')), 'total_value'],
              [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity']
            ],
            group: ['itemId', 'itemName', 'time', 'npcName', 'rsn'],
            limit: BATCH_SIZE,
            offset
          });
          console.log("Got drops, sorting through dropsBatch. length: " + dropsBatch.length);
          processDropsBatch(dropsBatch, dropsList, playerTotals, recentDrops, totalLoot);

          offset += BATCH_SIZE;
        } while (dropsBatch.length > 0);

        const result = {
          dropsList,
          playerTotals,
          recentDrops,
          totalLoot
        };

        // Store only high-value drops in Redis
        const highValueDrops = {
          dropsList,
          playerTotals,
          recentDrops: recentDrops.filter(drop => drop.totalValue > 500000 && drop.quantity === 1),
          totalLoot
        };

        // Log the size of the data being stored
        const serializedHighValueDrops = JSON.stringify(highValueDrops);
        const dataSize = Buffer.byteLength(serializedHighValueDrops);
        // console.log(`Storing high-value drops in Redis - Key: ${cacheKey}, Data Size: ${dataSize} bytes`);

        // Store the high-value drops result in Redis
        await client.set(cacheKey, serializedHighValueDrops); // Store without TTL

        return result;
      } else {
        const clanOb = await Clan.findOne({
          where: {
            cid: clanId
          }
        });
        let womClanId;
        if (clanOb) {
          womClanId = clanOb.womClanId
        } else {
          womClanId = 0;
        }
        const clanMembers = await ClanMembers.findAll({ where: { clanId: womClanId }, limit: RSN_BATCH_SIZE });
        rsns = clanMembers.map(member => member.displayName);
        console.log('Fetched clan members display names:', rsns.length);
      }
    }

    if (userId) {
      const user = await User.findOne({ where: { uid: userId } });
      if (user) {dr
        const rsAccount = await RSAccount.findOne({ where: { userId } });
        if (rsAccount) {
          rsns.push(rsAccount.displayName);
        }
      }
    }

    if (rsns.length === 0) {
      console.log('No RSNs found for given identifiers');
      return { dropsList: {}, playerTotals: {}, recentDrops: [], totalLoot: 0 };
    }

    const dropsList = {};
    const playerTotals = {};
    const recentDrops = [];
    const BATCH_SIZE = 375000;
    let totalLoot = 0;
    offset = 0;

    // Fetch drops data with pagination
    let dropsBatch;
    do {
      dropsBatch = await Drop.findAll({
        where: {
          rsn: rsns,
          time: {
            [Sequelize.Op.between]: [startTime, endTime]
          }
        },
        attributes: [
          'itemId',
          'rsn',
          'itemName',
          'npcName',
          'time',
          [Sequelize.fn('SUM', Sequelize.literal('COALESCE(`value`, 0) * COALESCE(`quantity`, 0)')), 'total_value'],
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity']
        ],
        group: ['itemId', 'itemName', 'time', 'npcName', 'rsn'],
        limit: BATCH_SIZE,
        offset
      });
      console.log("Got drops, sorting through dropsBatch. length: " + dropsBatch.length);
      processDropsBatch(dropsBatch, dropsList, playerTotals, recentDrops, totalLoot);

      offset += BATCH_SIZE;
    } while (dropsBatch.length > 0);

    const result = {
      dropsList,
      playerTotals,
      recentDrops,
      totalLoot
    };

    // Log the size of the data being stored
    const serializedHighValueDrops = JSON.stringify({
      dropsList,
      playerTotals,
      recentDrops: recentDrops.filter(drop => drop.totalValue > 500000 && drop.quantity === 1),
      totalLoot
    });
    const dataSize = Buffer.byteLength(serializedHighValueDrops);
    // console.log(`Storing high-value drops in Redis - Key: ${cacheKey}, Data Size: ${dataSize} bytes`);

    // Store the high-value drops result in Redis
    await client.set(cacheKey, serializedHighValueDrops); // Store without TTL

    return result;
  } catch (err) {
    console.error('Error fetching items:', err);
    throw err;
  }
};

const GetClanTotal = async (identifiers = {}, timeframe = { startTime: new Date(new Date().getFullYear(), new Date().getMonth(), 1), endTime: new Date() }) => {
  const { clanId, clanWomId, discordServerId, playerId, rsn, userUid, discordId } = identifiers;
  const { startTime, endTime } = timeframe;

  try {
    const cacheKey = getCacheKey(identifiers, timeframe);

    // Check if the response is in Redis cache
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log('Returning cached response from Redis');
      return JSON.parse(cachedData);
    }

    let clan, group, playerIds = [], playerIdToDisplayName = {};
    let userQueryConditions = [], users = [], rsns = [];

    //console.log("Identifiers:", identifiers);
    //console.log("Timeframe:", timeframe);

    // Fetch clan information
    if (clanId) {
      if (clanId === 0) {
        // If clanId is 0, fetch all players
        const allRSAccounts = await RSAccount.findAll();
        rsns = allRSAccounts.map(account => account.displayName);
      } else {
        clan = await Clan.findOne({ where: { cid: clanId } });
      }
    } else if (clanWomId) {
      clan = await Clan.findOne({ where: { womClanId: clanWomId } });
      if (clan) {
        group = await refreshClanData(clan);
      }
    } else if (discordServerId) {
      clan = await Clan.findOne({ where: { discordServerId } });
    }

    // Fetch group details and player IDs
    if (clan) {
      group = group || await rateLimitedWomClientCall(womclient.groups.getGroupDetails, clan.womClanId);
      group.memberships.forEach(membership => {
        playerIdToDisplayName[membership.playerId] = membership.player.displayName;
      });
      playerIds = Object.keys(playerIdToDisplayName).map(id => parseInt(id, 10));
    }

    // Build user query conditions
    if (playerId) userQueryConditions.push({ id: playerId });
    if (rsn) userQueryConditions.push({ displayName: rsn });
    if (userUid) userQueryConditions.push({ uid: userUid });
    if (discordId) userQueryConditions.push({ discordId });

    // Fetch users based on query conditions
    if (userQueryConditions.length > 0) {
      users = await User.findAll({
        where: {
          [Sequelize.Op.or]: userQueryConditions
        }
      });
    }

    // Process player IDs and RS accounts
    if (clan && playerIds.length > 0) {
      for (const playerId of playerIds) {
        const displayName = playerIdToDisplayName[playerId];
        let rsAccount = await RSAccount.findOne({ where: { womId: playerId } });

        if (rsAccount) {
          if (rsAccount.displayName !== displayName) {
            rsAccount.displayName = displayName;
            await rsAccount.save();
            console.log('Updated RSAccount displayName:', rsAccount);
          }
        } else {
          const user = users.find(user => userQueryConditions.some(cond => user[Object.keys(cond)[0]] === Object.values(cond)[0]));
          rsAccount = await RSAccount.create({
            displayName,
            womId: playerId,
            userId: user ? user.uid : null
          });
          console.log('Created new RSAccount:', rsAccount);
        }

        rsns.push(displayName);
      }
    }

    // Calculate total loot from Redis cache for all users
    const totalLoot = await calculateTotalLootFromCache(rsns, timeframe);

    // Calculate global and clan rankings using Redis cache
    let globalRanking = await calculateGlobalRankingFromCache(rsns, timeframe);
    let clanRanking = clan ? await calculateClanRankingFromCache(clan.cid, rsns, timeframe) : null;

    const result = { clan, users, playerIds, rsns, totalLoot, globalRanking, clanRanking };

    // Store the result in Redis
    await client.set(cacheKey, JSON.stringify(result)); // Store without TTL

    return result;
  } catch (err) {
    console.error('Error fetching stats:', err);
    throw err;
  }
};


module.exports = { GetClanTotal, calculateTotalLootFromCache, calculateGlobalRankingFromCache, calculateClanRankingFromCache, getAllItems };
