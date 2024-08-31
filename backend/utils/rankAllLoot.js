const NodeCache = require('node-cache');
const db = require('../../models');
const { Clan, Drop, RSAccount, ClanMembers } = db;
const { womclient, rateLimitedWomClientCall } = require('../wom/wom');
const { Sequelize } = require('sequelize');
const { GetClanTotal } = require('./getClanTotal');
const { refreshClanData } = require('./UpdateClanMember');


const cache = new NodeCache({ stdTTL: 300 });
const allCache = new NodeCache({ stdTTL: 60 });

const GetAllClansAndCache = async () => {
  try {
     //console.log("GetAllClansAndCache");
    const clans = await Clan.findAll();
    //console.log("Found all clans");
    for (const clan of clans) {
        console.log("Updating a clan...");
      const { cid: clanId, womClanId, discordServerId } = clan;
      const identifiers = { clanId, womClanId, discordServerId };
      await refreshClanData(clan);
      await GetClanTotal(identifiers);
      //allCache.set(cacheKey, true);
    }
  } catch (error) {
    console.error('Error fetching all clans:', error);
  }
};

const rankLoot = async (identifiers = {}) => {
  const { playerId, clanId } = identifiers;
  console.log("Called rankLoot with identifiers:", identifiers);
  try {
    const cacheKey = `rankLoot-${playerId || ''}-${clanId || ''}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log(`Returning cached result for ${cacheKey}`);
      return cachedResult;
    }

    let result;
    if (playerId && clanId) {
      console.log("Ranking player within their clan");
      result = await rankPlayerWithinClan(playerId, clanId);
    } else if (clanId) {
      console.log("Ranking clan globally");
      result = await rankClanGlobally(clanId);
    } else if (playerId) {
      console.log("Ranking player globally");
      result = await rankPlayerGlobally(playerId);
    } else {
      throw new Error('Must provide either playerId or clanId');
    }

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error in rankLoot function:", error);
    return null;
  }
};

const rankPlayerWithinClan = async (playerId, clanId) => {
  console.log(`rankPlayerWithinClan called with playerId: ${playerId}, clanId: ${clanId}`);
  const drops = await getDropsForPlayerInClan(playerId, clanId);
  console.log(`Found ${drops.length} drops for player within clan.`);
  const totalLoot = calculateTotalLoot(drops);
  console.log(`Total loot for player: ${totalLoot}`);
  const allClanDrops = await getTotalLootForAllClanMembers(clanId);
  console.log(`Total clan members: ${allClanDrops.length}`);
  const rank = calculateRank(totalLoot, allClanDrops.map(d => d.total_loot));

  return { rank, totalLoot, totalPlayers: allClanDrops.length };
};

const rankClanGlobally = async (clanId) => {
  console.log("rankClanGlobally with clanId", clanId);
  const clanDrops = await getDropsForClan(clanId);
  console.log(`Found drops for ${clanDrops.length} clan members.`);
  const totalLoot = calculateTotalLootFromClanMembers(clanDrops);
  console.log("Total loot for current clan:", totalLoot);
  const allClansDrops = await getTotalLootForAllClans();
  console.log(`Total loot for all clans calculated: ${allClansDrops.length}`);

  const rank = calculateRank(totalLoot, allClansDrops.map(c => c.total_loot));
  console.log("Rank for current clan:", rank);

  return { rank, totalLoot, totalClans: allClansDrops.length };
};

const rankPlayerGlobally = async (playerId) => {
  console.log(`rankPlayerGlobally called with playerId: ${playerId}`);
  const drops = await getDropsForPlayerGlobally(playerId);
  console.log(`Found ${drops.length} drops for player globally.`);
  const totalLoot = calculateTotalLoot(drops);
  console.log(`Total loot for player globally: ${totalLoot}`);
  const allPlayersDrops = await getTotalLootForAllPlayers();
  console.log(`Total loot for all players calculated: ${allPlayersDrops.length}`);
  const rank = calculateRank(totalLoot, allPlayersDrops.map(p => p.total_loot));

  return { rank, totalLoot, totalPlayers: allPlayersDrops.length };
};

const getDropsForPlayerInClan = async (playerId, clanId) => {
  const currentYmPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
  console.log(`getDropsForPlayerInClan called with playerId: ${playerId}, clanId: ${clanId}, partition: ${currentYmPartition}`);

  const rsAccounts = await RSAccount.findAll({ where: { womId: playerId } });
  const rsnList = rsAccounts.map(account => account.displayName);
  console.log("Player RSN list is " + rsnList);

  const drops = await Drop.findAll({
    where: {
      ym_partition: currentYmPartition,
      rsn: rsnList,
    }
  });

  console.log(`Found ${drops.length} drops for player in clan.`);
  return drops;
};

const getTotalLootForAllClanMembers = async (clanId) => {
  console.log(`Getting drops for clanId: ${clanId}`);
  const currentYmPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);

  const clanMembers = await ClanMembers.findAll({ where: { clanId } });
  const clanMemberList = clanMembers.map(member => member.displayName);

  const drops = await Drop.findAll({
    where: {
      ym_partition: currentYmPartition,
      rsn: clanMemberList,
    }
  });

  console.log(`Found ${drops.length} drops for all clan members.`);
  return clanMemberList.map(rsn => ({
    rsn,
    total_loot: drops.filter(drop => drop.rsn === rsn).reduce((acc, drop) => acc + (drop.quantity * drop.value), 0)
  }));
};

const getDropsForClan = async (clanId) => {
  return getTotalLootForAllClanMembers(clanId);
};

const getTotalLootForAllClans = async () => {
  const currentYmPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
  console.log(`getTotalLootForAllClans called with partition: ${currentYmPartition}`);
  const clans = await Clan.findAll();

  let allClansDrops = [];

  for (const clan of clans) {
    const clanMembers = await ClanMembers.findAll({ where: { clanId: clan.womClanId } });
    const clanMemberList = clanMembers.map(member => member.displayName);

    const drops = await Drop.findAll({
      where: {
        ym_partition: currentYmPartition,
        rsn: clanMemberList,
      }
    });

    const totalLoot = calculateTotalLoot(drops);
    allClansDrops.push({ clanId: clan.womClanId, total_loot: totalLoot });
  }

  console.log(`Total loots calculated for ${allClansDrops.length} clans.`);
  return allClansDrops;
};

const getDropsForPlayerGlobally = async (playerId) => {
  const currentYmPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
  console.log(`getDropsForPlayerGlobally called with playerId: ${playerId}, partition: ${currentYmPartition}`);

  const rsAccounts = await RSAccount.findAll({ where: { womId: playerId } });
  const rsnList = rsAccounts.map(account => account.displayName);

  const drops = await Drop.findAll({
    where: {
      ym_partition: currentYmPartition,
      rsn: rsnList,
    }
  });

  console.log(`Found ${drops.length} drops for player globally.`);
  return drops;
};

const getTotalLootForAllPlayers = async () => {
  const currentYmPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
  console.log(`getTotalLootForAllPlayers called with partition: ${currentYmPartition}`);

  const rsns = await Drop.findAll({
    attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('rsn')), 'rsn']],
    raw: true
  });

  const drops = await Drop.findAll({
    where: {
      ym_partition: currentYmPartition,
      rsn: rsns.map(rsnObj => rsnObj.rsn),
    }
  });

  console.log(`Found ${drops.length} drops for all players.`);
  return rsns.map(rsnObj => ({
    rsn: rsnObj.rsn,
    total_loot: drops.filter(drop => drop.rsn === rsnObj.rsn).reduce((acc, drop) => acc + (drop.quantity * drop.value), 0)
  }));
};

const calculateTotalLoot = (drops) => {
  console.log("Calculating total loot for", drops.length, "drops.");
  const totalLoot = drops.reduce((acc, drop) => {
    if (isNaN(drop.quantity) || isNaN(drop.value)) {
      console.error(`Invalid drop data: ${JSON.stringify(drop)}`);
      return acc;
    }
    const dropValue = drop.quantity * drop.value;
    return acc + dropValue;
  }, 0);
  console.log("Total loot calculated:", totalLoot);
  return totalLoot;
};

const calculateTotalLootFromClanMembers = (clanMembers) => {
  console.log("Calculating total loot for", clanMembers.length, "clan members.");
  const totalLoot = clanMembers.reduce((acc, member) => acc + member.total_loot, 0);
  console.log("Total loot calculated from clan members:", totalLoot);
  return totalLoot;
};

const calculateRank = (totalLoot, allLoots) => {
  if (allLoots.length === 1) {
    console.log("One entry, ranked 1.");
    return 1;
  }
  console.log(`Calculating rank. Total loot: ${totalLoot}, All loots: ${allLoots.length}`);
  const ranks = allLoots.sort((a, b) => b - a);
  console.log("Sorted ranks:", ranks);
  let rank = 1;
  for (const loot of ranks) {
    if (loot <= totalLoot) {
      break;
    }
    rank++;
  }
  console.log("Rank calculated:", rank);
  return rank;
};

setInterval(GetAllClansAndCache, 3600 * 1000); // Update every hour

module.exports = {
  GetAllClansAndCache,
  rankLoot,
  getDropsForPlayerInClan,
  getDropsForPlayerGlobally,
  getDropsForClan,
  calculateRank
};
