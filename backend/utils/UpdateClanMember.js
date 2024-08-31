const db = require('../../models');
const { Clan, User, Drop, RSAccount, ClanMembers } = db;
const { Sequelize } = require('sequelize');
const { womclient, rateLimitedWomClientCall } = require('../wom/wom'); 
// Cache to store the last request time and data for each clan
const cache = {};

const refreshClanData = async (clan) => {
  console.log("refreshClanData has been called");
  const now = Date.now();
  const cacheEntry = cache[clan.cid];

  if (cacheEntry && (now - cacheEntry.timestamp) < 60 * 60 * 1000) {
    return;
  } else {
    const group = await rateLimitedWomClientCall(womclient.groups.getGroupDetails, clan.womClanId);
    cache[clan.cid] = {
      timestamp: now,
      data: group
    };
    console.log("storeClanInDatabase");
    
    // Store refreshed data in the database
    await storeClanDataInDatabase(clan.womClanId, group);
  }
};

const storeClanDataInDatabase = async (clanId, group) => {
  await ClanMembers.destroy({ where: { clanId } });
  console.log("destroy old members");
  for (const membership of group.memberships) {
    const { playerId } = membership;
    const { displayName } = membership.player;
    await ClanMembers.create({
      clanId,
      playerId,
      displayName,
      lastUpdated: new Date()
    });
    let rsAccount = await RSAccount.findOne({ where: { womId: playerId } });

    if (rsAccount) {
      if (rsAccount.displayName !== displayName) {
        rsAccount.displayName = displayName;
        await rsAccount.save();
        console.log('Updated RSAccount displayName:', rsAccount);
      }
    } else {
      rsAccount = await RSAccount.create({
        displayName,
        womId: playerId
      });
      console.log('Created new RSAccount entry for ', rsAccount.displayName);
    }
  }
};

module.exports = { refreshClanData };
