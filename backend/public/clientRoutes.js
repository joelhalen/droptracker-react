const express = require('express');
const router = express.Router();
const { client, getCacheKey, trackedNPCs, getRealTimeRankings } = require('../redis/redisClient');

const getUserLootFromCache = async (rsn) => {
  const monthlyTimeframe = 'monthly';
  const allTimeLabel = 'all-time';

  const monthlyLoot = {};
  const allTimeLoot = {};

  for (const npcName of trackedNPCs) {
    const monthlyCacheKey = getCacheKey(rsn, npcName, monthlyTimeframe);
    const allTimeCacheKey = getCacheKey(rsn, npcName, allTimeLabel);

    const cachedMonthlyData = await client.get(monthlyCacheKey);
    const cachedAllTimeData = await client.get(allTimeCacheKey);

    monthlyLoot[npcName] = cachedMonthlyData ? parseFloat(JSON.parse(cachedMonthlyData).totalLoot) : 0;
    allTimeLoot[npcName] = cachedAllTimeData ? parseFloat(JSON.parse(cachedAllTimeData).totalLoot) : 0;

    console.log(`Retrieved from Redis - RSN: ${rsn}, NPC: ${npcName}, Monthly: ${monthlyLoot[npcName]}, All-time: ${allTimeLoot[npcName]}`);
  }

  return { monthlyLoot, allTimeLoot };
};

router.get('/user-loot/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const lootData = await getUserLootFromCache(username);
    res.json(lootData);
  } catch (error) {
    console.error('Error fetching user loot:', error);
    res.status(500).json({ message: 'Failed to fetch user loot' });
  }
});

router.get('/users-ranked', async (req, res) => {
  const { npcName, clanId } = req.query;
  const timeframeAllTime = 'all-time';
  const timeframeMonthly = 'monthly';

  try {
    let rankings = await getRealTimeRankings(timeframeAllTime, timeframeMonthly);

    if (npcName) {
      rankings = rankings.map(rank => {
        const npcAllTime = rank.allTime.find(npc => npc.npcName === npcName);
        const npcMonthly = rank.monthly.find(npc => npc.npcName === npcName);
        return {
          rsn: rank.rsn,
          totalOverallAllTime: rank.totalOverallAllTime,
          totalOverallMonthly: rank.totalOverallMonthly,
          npcAllTime: npcAllTime ? npcAllTime.totalLoot : 0,
          npcMonthly: npcMonthly ? npcMonthly.totalLoot : 0
        };
      });
    } else {
      rankings = rankings.map(rank => {
        const npcAllTime = {};
        const npcMonthly = {};
        rank.allTime.forEach(npc => {
          npcAllTime[npc.npcName] = npc.totalLoot;
        });
        rank.monthly.forEach(npc => {
          npcMonthly[npc.npcName] = npc.totalLoot;
        });
        return {
          rsn: rank.rsn,
          totalOverallAllTime: rank.totalOverallAllTime,
          totalOverallMonthly: rank.totalOverallMonthly,
          npcAllTime,
          npcMonthly
        };
      });
    }

    if (clanId) {
      const clanMembers = await ClanMembers.findAll({ where: { clanId } });
      const memberRSNs = clanMembers.map(member => member.rsn);
      rankings = rankings.filter(rank => memberRSNs.includes(rank.rsn));
    }

    res.json(rankings);
  } catch (error) {
    console.error('Error fetching user loot rankings:', error);
    res.status(500).json({ message: 'Failed to fetch user loot rankings' });
  }
});

module.exports = router;