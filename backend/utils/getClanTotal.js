const db = require('../../models'); // Adjust the path based on your directory structure
const { Clan, User, Drop } = db;
const { Sequelize } = require('sequelize');
const { WOMClient } = require('@wise-old-man/utils');

const womclient = new WOMClient({
  userAgent: '@joelhalen -discord'
});

// Cache to store the last request time and data for each clan
const cache = {};

const GetClanTotal = async (clanId) => {
  try {
    const clan = await Clan.findOne({
      where: { cid: clanId }
    });

    if (!clan) {
      throw new Error('Clan not found');
    }

    // Check cache for the clan data
    const now = Date.now();
    const cacheEntry = cache[clanId];

    let group;
    if (cacheEntry && (now - cacheEntry.timestamp) < 30 * 60 * 1000) { // 30 minutes
      group = cacheEntry.data;
      console.log('Using cached data for clan:', clanId);
    } else {
      // Fetch group details using the external API
      group = await womclient.groups.getGroupDetails(clan.womClanId);

      // Update the cache
      cache[clanId] = {
        timestamp: now,
        data: group
      };
      console.log('Fetched new data for clan:', clanId);
    }

    // Extract player IDs from the memberships array and create a map of playerId to displayName
    const playerIdToDisplayName = {};
    group.memberships.forEach(membership => {
      playerIdToDisplayName[membership.playerId] = membership.player.displayName;
    });
    const playerIds = Object.keys(playerIdToDisplayName).map(id => parseInt(id, 10));

    console.log('Player IDs:', playerIds);
    console.log('Player ID to DisplayName Map:', playerIdToDisplayName);

    // Log all users with their JSON fields
    let allUsers = await User.findAll({
      attributes: ['uid', 'wiseOldManIds', 'rsns'],
    });
    console.log('All users:', allUsers.map(user => ({
      uid: user.uid,
      wiseOldManIds: user.wiseOldManIds,
      rsns: user.rsns,
    })));

    // Construct the query for wiseOldManIds and rsns separately
    let wiseOldManIdsQueries = playerIds.map(id => `JSON_CONTAINS(wiseOldManIds, '[${id}]', '$')`);
    let rsnsQueries = Object.values(playerIdToDisplayName).map(name => `JSON_CONTAINS(rsns, '["${name}"]', '$')`);

    // Combine the queries with OR
    let combinedQuery = wiseOldManIdsQueries.concat(rsnsQueries).join(' OR ');

    // Fetch users whose wiseOldManIds or rsns contain any of the playerIds or displayNames
    let users = await User.findAll({
      where: Sequelize.literal(combinedQuery)
    });

    console.log('Users found:', users);

    // Add missing users
    for (let playerId in playerIdToDisplayName) {
      if (!users.find(user => user.wiseOldManIds.includes(Number(playerId)))) {
        const displayName = playerIdToDisplayName[playerId];
        const newUser = await User.create({
          displayName: displayName,
          wiseOldManIds: [Number(playerId)],
          rsns: [displayName],
          clanId: clanId
        });
        users.push(newUser);
        console.log(`Added new user: ${displayName} with playerId: ${playerId}`);
      }
    }

    // Map the users' wiseOldManIds to their respective RSNs and update clanId and wiseOldManIds
    const rsns = [];
    const usersToUpdate = [];

    users.forEach(user => {
      let updated = false;
      user.wiseOldManIds.forEach((womId, index) => {
        console.log(`Processing womId: ${womId} for user: ${user.displayName}`);
        if (playerIds.includes(womId)) {
          const displayName = playerIdToDisplayName[womId];
          console.log(`Found match for womId: ${womId} with displayName: ${displayName}`);
          if (user.rsns[index] !== displayName) {
            user.rsns[index] = displayName;
            updated = true;
          }
          rsns.push(displayName);
        }
      });

      // Update the clanId if it doesn't match
      if (user.clanId !== clanId) {
        user.clanId = clanId;
        updated = true;
      }

      // Check if wiseOldManIds needs to be updated
      if (user.wiseOldManIds.length === 0) {
        user.wiseOldManIds = playerIds.filter(id => user.rsns.includes(id));
        updated = true;
      }

      if (updated) {
        usersToUpdate.push({
          ...user.get(),
          displayName: user.rsns[0] // Ensure displayName is set to the first rsn
        });
      }
    });

    // Bulk update users in the database
    if (usersToUpdate.length > 0) {
      await User.bulkCreate(usersToUpdate, {
        updateOnDuplicate: ['clanId', 'wiseOldManIds', 'rsns', 'displayName']
      });
    }

    // Log the RSNs to debug
    console.log('RSNs:', rsns);

    // Fetch relevant drops based on RSNs
    const drops = await Drop.findAll({
      where: {
        rsn: {
          [Sequelize.Op.in]: rsns
        }
      }
    });

    // Log the drops query result to debug
    console.log('Drops:', drops);
    
    // Calculate the total loot from the fetched drops
    const totalLoot = drops.reduce((sum, drop) => sum + (drop.value * drop.quantity), 0);


    // Return all relevant data
    return { clan, group, users, playerIds, rsns, totalLoot };
  } catch (err) {
    console.error('Error fetching clan total loot:', err);
    throw err;
  }
};

module.exports = GetClanTotal;
