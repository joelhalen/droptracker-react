const redis = require('redis');
const { Clan, ClanMembers, Drop, RSAccount, sequelize } = require('../../models');
const { Sequelize } = require('sequelize');
const NodeCache = require('node-cache');
const CreateRSPlayer = require("../utils/CreateRSPlayer");
const cache = new NodeCache();

const client = redis.createClient();

client.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
  await client.connect();
};

const trackedNPCs = ['Chambers of Xeric',
  'Theatre of Blood', 'Tombs of Amascut',
  'Phantom Muspah', 'Zulrah', 'Vorkath', 'Leviathan',
  'Vardorvis', 'The Whisperer', 'Duke Sucellus',
  'Alchemical Hydra', 'General Graardor', 'Commander Zilyana',
  "K'ril Tsutsaroth", "Kree'arra", "The Gauntlet", 'The Corrupted Gauntlet',
  "Clue scroll (master)", "Clue scroll (easy)", "Clue scroll (medium)", "Clue scroll (elite)",
  'Barrows'];

const getCacheKey = (rsn, npcName, timeframe) => {
  return JSON.stringify({ rsn, npcName, timeframe });
};

const updateRedisCache = async (rsn, dropValue, npcName, timeframe) => {
  const cacheKey = getCacheKey(rsn, npcName, timeframe);

  const cachedData = await client.get(cacheKey);
  const data = cachedData ? JSON.parse(cachedData) : { totalLoot: 0 };

  data.totalLoot += dropValue;

  const serializedData = JSON.stringify(data);
  const dataSize = Buffer.byteLength(serializedData);

  // Log the data size and call stack
  //console.log(`Updating Redis Cache - Key: ${cacheKey}, Data Size: ${dataSize} bytes`);
  //console.log(`Call Stack: ${new Error().stack}`);

  await client.set(cacheKey, serializedData);
};

const fetchDataWithPagination = async (model, queryOptions, batchSize) => {
  let offset = 0;
  let results = [];
  let batch;

  do {
    batch = await model.findAll({
      ...queryOptions,
      limit: batchSize,
      offset,
    });

    results = results.concat(batch);
    offset += batchSize;
  } while (batch.length > 0);

  return results;
};

const initializeCache = async () => {
  const BATCH_SIZE = 500;
  const specificRSN = 'Juju Shinobi';

  try {
    const allAccounts = await fetchDataWithPagination(RSAccount, {}, BATCH_SIZE);

    for (const account of allAccounts) {
      const rsn = account.displayName;

      // Initialize overall monthly and all-time totals
      let overallMonthlyTotal = 0;
      let overallAllTimeTotal = 0;

      for (const npcName of trackedNPCs) {
        const ym_partition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);

        const monthlyDropsQuery = `
          SELECT SUM(value * quantity) as totalLoot
          FROM drops
          WHERE rsn = :rsn
            AND npc_name = :npcName
            AND ym_partition = :ym_partition
        `;

        const allTimeDropsQuery = `
          SELECT SUM(value * quantity) as totalLoot
          FROM drops
          WHERE rsn = :rsn
            AND npc_name = :npcName
        `;

        try {
          const [monthlyDropsResult] = await sequelize.query(monthlyDropsQuery, {
            replacements: { rsn, npcName, ym_partition },
            type: Sequelize.QueryTypes.SELECT
          });

          const [allTimeDropsResult] = await sequelize.query(allTimeDropsQuery, {
            replacements: { rsn, npcName },
            type: Sequelize.QueryTypes.SELECT
          });

          const monthlyDrops = monthlyDropsResult.totalLoot ? parseFloat(monthlyDropsResult.totalLoot) : 0;
          const allTimeDrops = allTimeDropsResult.totalLoot ? parseFloat(allTimeDropsResult.totalLoot) : 0;

          overallMonthlyTotal += monthlyDrops;
          overallAllTimeTotal += allTimeDrops;

          await updateRedisCache(rsn, monthlyDrops, npcName, 'monthly');
          await updateRedisCache(rsn, allTimeDrops, npcName, 'all-time');

          if (rsn === specificRSN) {
            console.log(`Monthly Drops Result for RSN: ${rsn}, NPC: ${npcName}:`, monthlyDropsResult);
            console.log(`All-time Drops Result for RSN: ${rsn}, NPC: ${npcName}:`, allTimeDropsResult);
          }
        } catch (err) {
          console.error(`Error querying drops for RSN: ${rsn}, NPC: ${npcName}`, err);
          continue;
        }
      }

      // Update overall totals in Redis
      await updateRedisCache(rsn, overallMonthlyTotal, 'overall', 'monthly');
      await updateRedisCache(rsn, overallAllTimeTotal, 'overall', 'all-time');
    }

    console.log('Cache initialized successfully');
  } catch (err) {
    console.error('Error initializing cache:', err);
  }
};
const getRealTimeRankings = async (timeframeAllTime, timeframeMonthly) => {
  const allAccounts = await fetchDataWithPagination(RSAccount, {}, 1000);

  const rankings = await Promise.all(allAccounts.map(async (account) => {
    const rsn = account.displayName;

    const lootDataAllTime = await Promise.all(trackedNPCs.map(async (npcName) => {
      const cacheKeyAllTime = getCacheKey(rsn, npcName, timeframeAllTime);
      const cachedDataAllTime = await client.get(cacheKeyAllTime);
      return {
        npcName,
        totalLoot: cachedDataAllTime ? parseFloat(JSON.parse(cachedDataAllTime).totalLoot) : 0
      };
    }));

    const lootDataMonthly = await Promise.all(trackedNPCs.map(async (npcName) => {
      const cacheKeyMonthly = getCacheKey(rsn, npcName, timeframeMonthly);
      const cachedDataMonthly = await client.get(cacheKeyMonthly);
      return {
        npcName,
        totalLoot: cachedDataMonthly ? parseFloat(JSON.parse(cachedDataMonthly).totalLoot) : 0
      };
    }));

    const overallAllTimeKey = getCacheKey(rsn, 'overall', 'all-time');
    const overallMonthlyKey = getCacheKey(rsn, 'overall', 'monthly');
    const overallAllTimeData = await client.get(overallAllTimeKey);
    const overallMonthlyData = await client.get(overallMonthlyKey);
    const totalOverallAllTime = overallAllTimeData ? parseFloat(JSON.parse(overallAllTimeData).totalLoot) : 0;
    const totalOverallMonthly = overallMonthlyData ? parseFloat(JSON.parse(overallMonthlyData).totalLoot) : 0;

    return {
      rsn,
      totalOverallAllTime,
      totalOverallMonthly,
      allTime: lootDataAllTime,
      monthly: lootDataMonthly
    };
  }));

  rankings.sort((a, b) => b.totalOverallAllTime - a.totalOverallAllTime);

  return rankings;
};

const initializeRecentDropsCache = async () => {
  const cacheKey = 'recent_drops';
  const minDropValue = process.env.MINIMUM_DROP_VALUE;

  try {
    const recentDrops = await Drop.findAll({
      attributes: [
        'itemId',
        'rsn',
        'itemName',
        'npcName',
        'time',
        [Sequelize.fn('SUM', Sequelize.literal('COALESCE(`value`, 0) * COALESCE(`quantity`, 0)')), 'total_value'],
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity_month'],
        [Sequelize.literal('(SELECT SUM(COALESCE(quantity, 0)) FROM drops WHERE drops.item_id = Drop.item_id)'), 'total_quantity_all_time']
      ],
      include: [
        {
          model: RSAccount,
          attributes: ['userId', 'displayName', 'womId'],
          required: false
        }
      ],
      where: Sequelize.where(Sequelize.literal('ym_partition'), Sequelize.literal('YEAR(CURRENT_DATE()) * 100 + MONTH(CURRENT_DATE())')),
      group: ['itemId', 'itemName', 'time', 'RSAccount.userId'],
      having: Sequelize.where(Sequelize.fn('SUM', Sequelize.literal('`value` * `quantity`')), '>', minDropValue),
      order: [['time', 'DESC']],
      limit: 10
    });

    const formattedDrops = await Promise.all(recentDrops.map(async drop => {
      let userId = drop.RSAccount ? drop.RSAccount.userId : null;
      if (!userId && drop.rsn) {
        const rsAccount = await RSAccount.findOne({ where: { displayName: drop.rsn } });
        const displayName = drop.rsn;
        if (!rsAccount) {
          const createdRSAccount = await CreateRSPlayer(displayName);
          userId = createdRSAccount.userId;
        } else {
          userId = rsAccount.userId;
        }
      }

      return {
        ...drop.get(),
        userId: userId,
        total_value: formatValue(drop.get('total_value')),
        total_quantity_month: formatValue(drop.get('total_quantity_month')),
        total_quantity_all_time: formatValue(drop.get('total_quantity_all_time'))
      };
    }));

    const responseData = {
      recentDrops: formattedDrops,
      executionTime: null // Not relevant for startup initialization
    };

    cache.set(cacheKey, responseData);

    console.log('Recent drops cache initialized successfully');
  } catch (error) {
    console.error('Error initializing recent drops cache:', error);
  }
};

const addDropToRecentCache = async (newDrop) => {
  const cacheKey = 'recent_drops';
  const cachedData = cache.get(cacheKey);
  const minDropValue = process.env.MINIMUM_DROP_VALUE;

  if (!cachedData) {
    return;
  }

  if (newDrop.value * newDrop.quantity < minDropValue) {
    return;
  }

  let userId = newDrop.rsn;
  const rsAccount = await RSAccount.findOne({ where: { displayName: newDrop.rsn } });
  if (!rsAccount) {
    const createdRSAccount = await CreateRSPlayer(newDrop.rsn);
    userId = createdRSAccount.userId;
  } else {
    userId = rsAccount.userId;
  }

  const formattedDrop = {
    ...newDrop,
    userId: userId,
    total_value: formatValue(newDrop.value * newDrop.quantity),
    total_quantity_month: formatValue(newDrop.quantity),
    total_quantity_all_time: formatValue(newDrop.total_quantity_all_time)
  };

  cachedData.recentDrops.unshift(formattedDrop);
  if (cachedData.recentDrops.length > 10) {
    cachedData.recentDrops.pop();
  }

  cache.set(cacheKey, cachedData);
};


const formatValue = (value) => {
    if (value == null) {
    return '0';
  }
  if (value >= 1e9) {
    return (value / 1e9).toFixed(3) + 'B';
  } else if (value >= 1e6) {
    return (value / 1e6).toFixed(2) + 'M';
  } else if (value >= 1e3) {
    return (value / 1e3).toFixed(2) + 'K';
  } else {
    return value.toString();
  }
};

module.exports = { client, cache, connectRedis, getCacheKey, updateRedisCache, initializeCache, getRealTimeRankings, trackedNPCs, addDropToRecentCache, initializeRecentDropsCache };
