const express = require('express');
const router = express.Router();
const { WOMClient } = require('@wise-old-man/utils');
const { getVoiceChannels, getTextChannels } = require('../discord/GetChannels');
const { womclient, rateLimitedWomClientCall } = require('../wom/wom');
const axios = require('axios');
const db = require('../../models'); 
const CreateRSPlayer = require('../utils/CreateRSPlayer');
const GetPluginInstalls = require('../utils/GetPluginInstalls');
const crypto = require('crypto');
const { Sequelize, Op } = require('sequelize');
const { UserSettings, User, Clan, Drop, DropTotal, Log, NewsPost, Notification, ClanSettings, DiscordEmbed, RSAccount } = require('../../models');
const { sendMessageToAllClients, sendMessageToLocalClients } = require('../utils/websocketMessageAll');
const { client, getCacheKey, trackedNPCs, getRealTimeRankings, cache } = require('../redis/redisClient');
const SECRET_KEY = process.env.SECRET_KEY;
const jwt = require('jsonwebtoken');


router.get('/discord/get-voice-channels', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.id;

    const user = await User.findOne({
      where: { uid: userId }
    });

    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    const voiceChannels = await getVoiceChannels(req.query.guildId);
    res.json(voiceChannels);
  } catch (error) {
    console.error('Error fetching voice channels:', error);
    res.status(500).json({ message: 'Failed to fetch voice channels' });
  }
});

router.get('/discord/get-text-channels', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.id;

    const user = await User.findOne({
      where: { uid: userId }
    });

    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    const textChannels = await getTextChannels(req.query.guildId);
    res.json(textChannels);
  } catch (error) {
    console.error('Error fetching text channels:', error);
    res.status(500).json({ message: 'Failed to fetch text channels' });
  }
});

router.get('/check-rsn-uniqueness', async (req, res) => {
  const { rsn, userId } = req.query;

  if (!rsn || !userId) {
    return res.status(400).json({ error: 'RSN and userId are required' });
  }

  try {
    const lowerCasedRSN = rsn.toLowerCase();
    let womId = null;
    let isUnique = true;
    let overallLevel = null;
    let ehb = null;
    let ehp = null;
    let accountWithoutUser = false;

    // Check if RSN already exists
    const rsAccount = await RSAccount.findOne({ where: { displayName: rsn } });
    if (rsAccount) {
      if (!rsAccount.userId) {
        accountWithoutUser = true;
      } else {
        isUnique = false;
      }
    }

    if (accountWithoutUser || isUnique) {
      // Fetch player details from WOM
      try {
        const player = await womclient.players.getPlayerDetails(rsn);

        if (player) {
          womId = player.id;
          overallLevel = player.latestSnapshot.data.skills.overall.level;
          ehb = parseFloat(player.ehb.toFixed(2));
          ehp = parseFloat(player.ehp.toFixed(2));

          // Find the user by discordId
          const user = await User.findOne({ where: { discordId: userId } });

          if (user) {
            // Create new RSAccount entry if the rsaccount doesn't exist
            if (!rsAccount) {
              newRsAccount = await RSAccount.create({
                displayName: rsn,
                womId: womId,
                userId: user.uid
              });
              console.log('Created new RSAccount:', newRsAccount);
            } else {
              rsAccount.userId = user.uid;
              await rsAccount.save();
              newRsAccount = rsAccount;
              console.log('Updated RSAccount userId:', rsAccount);
            }

            // Log the event
            await Log.create({
              event_type: "rsn claimed",
              description: `${userId} has claimed ${rsn} (womId: ${womId})`,
              event_id: 2,
              user_id: user.uid,
              additional_data: { rsn, womId, overallLevel, ehb, ehp }
            });
            const type = 'send_message';
            const targetChannel = null;
            const targetUser = userId;
            const content = `Hey, <@${targetUser}>!\n`;
            const tokenCmd = "</token:1263278881155186718>"
            const embed = {
                title: 'Account Claimed:',
                description: `${rsn} \n (WOM ID: \`${womId}\`)\n` +
                        `Please remember, you'll want to use your ${tokenCmd} on RuneLite with this account now!`,
                color: 0x00ff00,
                thumbnail: {
                    url: 'https://www.droptracker.io/img/droptracker-small.gif'
                },
                footer: {
                    text: 'If this was a mistake, please reach out via our Discord server.'
                },
                timestamp: new Date()
                };
            sendMessageToLocalClients(type, targetChannel, targetUser, content, embed);

          } else {
            console.error('User not found for userId:', userId);
            return res.status(404).json({ error: 'User not found' });
          }
        } else {
          console.error('Player not found for rsn:', rsn);
          return res.status(404).json({ error: 'Player not found' });
        }
      } catch (apiError) {
        if (apiError.statusCode === 404) {
          console.error('Player not found for rsn:', rsn);
          return res.status(404).json({ error: 'Player not found' });
        } else {
          console.error('Error fetching player details:', apiError);
          return res.status(500).json({ error: 'Error fetching player details' });
        }
      }
    } else {
      console.log('RSN not unique:', rsn);

    }

    res.json({ isUnique, womId, overallLevel, ehb, ehp, accountWithoutUser });
  } catch (error) {
    console.error('Error checking RSN uniqueness:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/top_players_by_drops', async (req, res) => {
  const cacheKey = `top_players_by_drops`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const topPlayers = await Drop.findAll({
      attributes: [
        'rsn',
        [Sequelize.fn('SUM', Sequelize.literal('COALESCE(`value`, 0) * COALESCE(`quantity`, 0)')), 'total_value'],
        ],
      include: [{
        model: User,
        attributes: ['uid', 'displayName'],
        where: Sequelize.where(Sequelize.fn('JSON_CONTAINS', Sequelize.col('rsns'), Sequelize.fn('JSON_QUOTE', Sequelize.col('rsn'))), true)
      }],
      where: {
        time: {
          [Op.gte]: Sequelize.literal('NOW() - INTERVAL 7 DAY')
        }
      },
      group: ['rsn', 'User.uid', 'User.displayName'],
      order: [[Sequelize.literal('total_value'), 'DESC']],
      limit: 10
    });

    const formattedPlayers = topPlayers.map(player => ({
      rsn: player.rsn,
      totalValue: formatValue(player.total_value),
      registered: !!player.User.uid,
      userId: player.User.uid || null,
      displayName: player.User.displayName || null
    }));

    cache.set(cacheKey, formattedPlayers);

    res.json(formattedPlayers);
  } catch (error) {
    console.error('Error fetching top players by drops:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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

router.get('/recent_drops', async (req, res) => {
  const cacheKey = 'recent_drops';
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.json(cachedData);
  } else {
    res.status(500).json({ message: 'Recent drops cache is not available' });
  }
});




router.post('/send_discord_message', (req, res) => {
  const authKey = req.headers['authorization'];

  if (authKey !== process.env.LOCAL_EMBEDDED_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { type, targetChannel, targetUser, content, embed } = req.body;

  if (!targetUser && !targetChannel) {
    return res.status(400).json({ error: 'targetUser or targetChannel is required' });
  }

  sendMessageToAllClients(type, targetChannel, targetUser, content, embed);

  res.status(200).json({ message: 'Message sent to the new user' });
});

router.get('/most_valuable', async (req, res) => {
  const cacheKey = 'most_valuable';
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const valuableLoots = await Drop.findAll({
      attributes: [
        'item_id',
        'item_name',
        'value',
        [Sequelize.fn('SUM', Sequelize.literal('COALESCE(`value`, 0) * COALESCE(`quantity`, 0)')), 'total_value'],
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity_month'],
        [Sequelize.literal('(SELECT SUM(quantity) FROM drops WHERE drops.item_id = Drop.item_id)'), 'total_quantity_all_time'],
        'npc_name'
      ],
      where: Sequelize.where(Sequelize.literal('ym_partition'), Sequelize.literal('YEAR(CURRENT_DATE()) * 100 + MONTH(CURRENT_DATE())')),
      group: ['item_id', 'item_name'],
      order: [[Sequelize.literal('total_value'), 'DESC']],
      limit: 10
    });

    const formattedLoots = valuableLoots.map(loot => ({
      ...loot.get(),
      value: 
      (loot.get('value')),
      total_value: formatValue(loot.get('total_value')),
      total_quantity_month: formatValue(loot.get('total_quantity_month')),
      total_quantity_all_time: formatValue(loot.get('total_quantity_all_time'))
    }));

    cache.set(cacheKey, formattedLoots);

    res.json(formattedLoots);
  } catch (error) {
    console.error('Error fetching valuable loots:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/stats', async (req, res) => {
  const cacheKey = 'stats';
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const totalInstalls = await GetPluginInstalls();

    const stats = await Drop.findOne({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('*')), 'totalDropCtMonth'],
        [Sequelize.fn('SUM', Sequelize.col('value')), 'lootThisMonth'],
        [Sequelize.literal('(SELECT COUNT(*) FROM rsaccounts)'), 'totalUsers']
      ],
      where: {
        time: {
          [Op.gte]: Sequelize.literal('DATE_FORMAT(NOW(),"%Y-%m-01")')
        }
      }
    });

    const formattedStats = {
      ...stats.get(),
      totalDropCtMonth: formatValue(stats.get('totalDropCtMonth')),
      lootThisMonth: formatValue(stats.get('lootThisMonth')),
      totalUsers: formatValue(stats.get('totalUsers')),
      pluginUsers: totalInstalls
    };
    
    cache.set(cacheKey, formattedStats);

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/news/create', async (req, res) => {
  const { authKey, title, content, postType, pinned, imageUrl, videoUrl } = req.query;

  if (authKey !== process.env.SECRET_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!title || !content || !postType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const newNewsPost = await NewsPost.create({
      title,
      content,
      postType,
      pinned: pinned === 'true', 
      imageUrl: imageUrl || null, 
      videoUrl: videoUrl || null, 
      timestamp: new Date() // Set the timestamp to the current date and time
    });

    // Invalidate cache
    cache.del('news');

    res.json(newNewsPost);
  } catch (error) {
    console.error('Error creating news post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/news', async (req, res) => {
  const cacheKey = 'news';
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const newsPosts = await NewsPost.findAll({
      order: [['pinned', 'DESC'], ['timestamp', 'DESC']]
    });

    cache.set(cacheKey, newsPosts);

    res.json(newsPosts);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

{/*  
    
    Profile Page Endpoints    

*/}
// Fetch user data by user ID
router.get('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log("Received request for user with id " + userId);

  try {
    // Fetch the user and clan information
    const user = await User.findByPk(userId, {
      include: {
        model: Clan,
        as: 'clan',
        attributes: ['cid', 'displayName', 'description', 'clanType', 'discordServerId'],
        required: false // Allow users without a clan
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch RS accounts for the user
    const userRSAccounts = await RSAccount.findAll({
      where: {
        userId: user.uid
      }
    });

    if (userRSAccounts.length === 0) {
      return res.status(400).json({ error: 'No RSNs found for the user' });
    }

    const displayNames = userRSAccounts.map(account => account.displayName);
    console.log("User RSNs: ", displayNames);

    // Fetch drops for the user's RSNs
    const drops = await Drop.findAll({
      where: {
        rsn: { [Op.in]: displayNames }
      },
      attributes: ['itemName', 'quantity', 'value', 'time']
    });

    const currentMonthPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);

    const totalDropsMonth = await Drop.sum('quantity', {
      where: {
        rsn: { [Op.in]: displayNames },
        ym_partition: currentMonthPartition
      }
    });

    const totalDropsAllTime = await Drop.sum('quantity', {
      where: {
        rsn: { [Op.in]: displayNames }
      }
    });

    // Calculate total value month
    const totalValueMonth = await Drop.findAll({
      where: {
        rsn: { [Op.in]: displayNames },
        ym_partition: currentMonthPartition
      },
      attributes: [[Sequelize.literal('SUM(quantity * value)'), 'totalValueMonth']]
    });

    // Calculate total value all time
    const totalValueAllTime = await Drop.findAll({
      where: {
        rsn: { [Op.in]: displayNames }
      },
      attributes: [[Sequelize.literal('SUM(quantity * value)'), 'totalValueAllTime']]
    });

    const userData = {
      ...user.toJSON(),
      drops,
      totalDropsMonth: formatValue(totalDropsMonth) || 0,
      totalDropsAllTime: formatValue(totalDropsAllTime) || 0,
      totalValueMonth: formatValue(totalValueMonth[0]?.dataValues?.totalValueMonth) || 0,
      totalValueAllTime: formatValue(totalValueAllTime[0]?.dataValues?.totalValueAllTime) || 0
    };

    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//router.get('/users/:userId/recommended/:profileId', async (req, res) => {
//  //  const { userId, profileId } = req.params; 
//    const targetUser = await User.findOne({
//        where: {
//            uid: profileId
//        }
//        });
//    if (!targetUser) {
//
//    }
    
    
    
    
//});

// Fetch drop data for a user by user ID
router.get('/users/:userId/drops', async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the user's RS accounts to identify their drops
    const userRSAccounts = await RSAccount.findAll({
      where: {
        userId
      }
    });

    if (userRSAccounts.length === 0) {
      return res.status(404).json({ error: 'No RSNs found for the user' });
    }

    const displayNames = userRSAccounts.map(account => account.displayName);

    // Fetch drops using the RSNs with filters for value and image URL
    const drops = await Drop.findAll({
      where: {
        rsn: { [Op.in]: displayNames },
        value: { [Op.gt]: 1000000 }, // Greater than 1,000,000
        imageUrl: { [Op.ne]: '' }   // Image URL is not empty
      },
      attributes: ['rsn', 'itemName', 'npcName', 'quantity', 'value', 'time', 'imageUrl'],
      order: [['time', 'DESC']]  // Ordering by the time the drops were received
    });

    if (!drops || drops.length === 0) {
      return res.status(404).json({ error: 'No qualifying drops found for the user' });
    }

    // Format the drops and calculate total_value
    const formattedDrops = drops.map(drop => {
      const totalValue = drop.quantity * drop.value;
      return {
        ...drop.get(),
        total_value: formatValue(totalValue)
      };
    });

    res.json(formattedDrops);
  } catch (error) {
    console.error('Error fetching drop data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/users/:userId/drops/month', async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the user's RS accounts to identify their drops
    const userRSAccounts = await RSAccount.findAll({
      where: {
        userId
      }
    });

    if (userRSAccounts.length === 0) {
      return res.status(404).json({ error: 'No RSNs found for the user' });
    }

    const displayNames = userRSAccounts.map(account => account.displayName);

    // Calculate the ym_partition for the current month
    const currentYmPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);

    // Fetch drops for the past calendar month
    const drops = await Drop.findAll({
      attributes: [
        [Sequelize.literal('DATE(time)'), 'date'],
        [Sequelize.fn('SUM', Sequelize.literal('COALESCE(`value`, 0) * COALESCE(`quantity`, 0)')), 'total_value']
      ],
      where: {
        rsn: { [Op.in]: displayNames },
        ym_partition: currentYmPartition
      },
      group: [Sequelize.literal('DATE(time)')],
      order: [[Sequelize.literal('DATE(time)'), 'ASC']]
    });

    if (!drops || drops.length === 0) {
      return res.status(404).json({ error: 'No drops found for the user in the past month' });
    }

    const formattedDrops = drops.map(drop => ({
      date: drop.get('date'),
      total_value: drop.get('total_value')
    }));

    res.json(formattedDrops);
  } catch (error) {
    console.error('Error fetching drop data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;