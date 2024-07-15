const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { WOMClient } = require('@wise-old-man/utils');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });
const { sendMessageToAllClients, sendMessageToLocalClients } = require('../utils/websocketMessageAll');
const axios = require('axios');
const db = require('../../models'); // Adjust the path based on your directory structure
const { User, Clan, Drop, DropTotal, Log, NewsPost, Notification, ClanSettings, DiscordEmbed } = require('../../models');
const GetClanTotal = require('../utils/GetClanTotal');


const { Sequelize, Op } = require('sequelize');

const womclient = new WOMClient({
  userAgent: '@joelhalen -discord'
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SECRET_KEY = process.env.SECRET_KEY;


        {/* Discord Routes for login/authentication */}


router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (user && user.password === password) { // Assuming you have a password field
      const token = jwt.sign({ id: user.uid, email: user.email }, SECRET_KEY);
      res.json({ user, token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  console.log('Received code from Discord:', code);

  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('Access token received from Discord:', accessToken);

    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const discordUser = userResponse.data;
    console.log('User info from Discord:', discordUser);

    let user = await User.findOne({ where: { discordId: discordUser.id } });
    let isNewUser = false;

    if (!user) {
      const email = discordUser.email || '';
      user = await User.create({
        displayName: discordUser.username,
        discordId: discordUser.id,
        email: email
      });
      isNewUser = true;
      const type = 'send_message';
      const targetChannel = null;
      const targetUser = discordUser.id;
      const content = `Hey, <@${targetUser}>!`;
      const embed = {
        title: 'Your account has been registered!',
        description: 'Welcome to the DropTracker - an all-in-one solution for tracking drops & competing in leaderboards.',
        color: 0x00ff00,
        fields: [
          {
            name: 'What now?',
            value: 'Make sure you have our [RuneLite plugin](https://www.droptracker.io/runelite) installed!\n' +
              'Join our [Discord server](https://www.droptracker.io/discord) so you can stay in-the-loop on what to expect!',
            inline: false
          },
          {
            name: 'Running a clan?',
            value: 'Our website has some documentation that you may want to read to understand how you can get the bot working for your server!',
            inline: true
          }
        ],
        thumbnail: {
          url: 'https://www.droptracker.io/img/droptracker-small.gif'
        },
        footer: {
          text: 'https://www.droptracker.io/'
        },
        timestamp: new Date()
      };
      sendMessageToLocalClients(type, targetChannel, targetUser, content, embed);
    }

    const token = jwt.sign({ id: user.id, username: user.displayName, email: user.email }, SECRET_KEY);
    res.redirect(`http://droptracker.io:21222?token=${token}${isNewUser ? '&new=true' : ''}`);
  } catch (error) {
    console.error('Error during Discord OAuth2 callback:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);
    console.log('Decoded token:', decodedToken);

    const user = await User.findOne({
      where: { email: decodedToken.email },
      attributes: ['uid', ['displayName', 'username'], 'email', 'discordId']
    });

    if (user) {
      console.log('User found:', user);
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

{/* Website notifications (create + get) */}

router.get('/notifications', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, SECRET_KEY);

    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [{ userId: decodedToken.id }, { isGlobal: true }]
      },
      order: [['createdAt', 'DESC']]
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/api/notifications', async (req, res) => {
  const { userId, message, type, isGlobal } = req.body;
  if (!message || !type || isGlobal === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await Notification.create({
      userId: isGlobal ? null : userId,
      message,
      type,
      isGlobal
    });
    res.status(201).json({ message: 'Notification created successfully' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});


        {/* data response functions */}


router.get('/api/get-user-rsns', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'UserId is required' });
  }

  try {
    const user = await User.findOne({ where: { discordId: userId } });
    if (user) {
      res.json({ rsns: user.rsns });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user RSNs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/check-rsn-uniqueness', async (req, res) => {
  const { rsn, userId } = req.query;
  if (!rsn || !userId) {
    return res.status(400).json({ error: 'RSN and userId are required' });
  }

  try {
    const users = await User.findAll();
    const lowerCasedRSN = rsn.toLowerCase();
    let womId = null;
    let isUnique = true;
    let overallLevel = null;
    let ehb = null;
    let ehp = null;

    for (const user of users) {
      const rsns = user.rsns;
      if (rsns.some(userRSN => userRSN.toLowerCase() === lowerCasedRSN)) {
        isUnique = false;
        break;
      }
    }

    if (isUnique) {
      const player = await womclient.players.getPlayerDetails(rsn);
      if (player) {
        womId = player.id;
        overallLevel = player.latestSnapshot.data.skills.overall.level;
        ehb = parseFloat(player.ehb.toFixed(2));
        ehp = parseFloat(player.ehp.toFixed(2));

        const user = await User.findOne({ where: { discordId: userId } });

        if (user) {
          let userRSNs = user.rsns;
          let userWomIds = user.wiseOldManIds;
          let userDroptrackerId = user.uid;

          userRSNs.push(rsn);
          userWomIds.push(womId);

          await User.update(
            {
              rsns: userRSNs,
              wiseOldManIds: userWomIds
            },
            { where: { discordId: userId } }
          );

          await Log.create({
            event_type: "rsn claimed",
            description: `${userId} has claimed ${rsn} (womId: ${womId})`,
            event_id: 2,
            user_id: userDroptrackerId,
            additional_data: { rsn, womId, overallLevel, ehb, ehp }
          });

          console.log(`${rsn} claimed by ID ${userId}`);
        } else {
          console.error('User not found for userId:', userId);
        }
      } else {
        console.error('Player not found for rsn:', rsn);
      }
    } else {
      console.log('RSN not unique:', rsn);
    }

    res.json({ isUnique, womId, overallLevel, ehb, ehp });
  } catch (error) {
    console.error('Error checking RSN uniqueness:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/top_players_by_drops', async (req, res) => {
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

router.get('/api/recent_drops', async (req, res) => {
  const cacheKey = 'recent_drops';
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.json(cachedData);
  }

  const startTime = process.hrtime();
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
          model: User,
          attributes: ['uid'],
          required: false,
          where: Sequelize.literal('FIND_IN_SET(Drop.rsn, User.rsns)')
        }
      ],
      where: Sequelize.where(Sequelize.literal('ym_partition'), Sequelize.literal('YEAR(CURRENT_DATE()) * 100 + MONTH(CURRENT_DATE())')),
      group: ['itemId', 'itemName', 'time', 'User.uid'],
      having: Sequelize.where(Sequelize.fn('SUM', Sequelize.literal('COALESCE(`value`, 0) * COALESCE(`quantity`, 0)')), '>', minDropValue),
      order: [['total_value', 'DESC']],
      limit: 10
    });

    console.log('Query result:', recentDrops);

    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] * 1e9 + endTime[1]) / 1e6;

    const formattedDrops = recentDrops.map(drop => ({
      ...drop.get(),
      uid: drop.User ? drop.User.uid : 0,
      total_value: formatValue(drop.get('total_value')),
      total_quantity_month: formatValue(drop.get('total_quantity_month')),
      total_quantity_all_time: formatValue(drop.get('total_quantity_all_time'))
    }));

    const responseData = {
      recentDrops: formattedDrops,
      executionTime: `${executionTime.toFixed(2)} ms`
    };

    cache.set(cacheKey, responseData);

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching recent drops:', error);

    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] * 1e9 + endTime[1]) / 1e6;

    res.status(500).json({
      error: 'Internal Server Error',
      executionTime: `${executionTime.toFixed(2)} ms`
    });
  }
});




router.post('/api/send_discord_message', (req, res) => {
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

router.get('/api/most_valuable', async (req, res) => {
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
      value: formatValue(loot.get('value')),
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


router.get('/api/stats', async (req, res) => {
  const cacheKey = 'stats';
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const stats = await Drop.findOne({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('*')), 'totalDropCtMonth'],
        [Sequelize.fn('SUM', Sequelize.col('value')), 'lootThisMonth'],
        [Sequelize.literal('(SELECT COUNT(*) FROM users)'), 'totalUsers'],
        [Sequelize.literal('(SELECT COUNT(*) FROM users WHERE discordId != 0)'), 'pluginUsers']
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
      pluginUsers: formatValue(stats.get('pluginUsers'))
    };

    cache.set(cacheKey, formattedStats);

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/news', async (req, res) => {
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
router.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log("Received request for user with id " + userId);

  try {
    // Fetch the user and clan information
    const user = await User.findByPk(userId, {
      include: {
        model: Clan,
        as: 'clan',
        attributes: ['cid', 'displayName', 'description', 'clanType', 'discordServerId']
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rsns = user.rsns;

    if (!Array.isArray(rsns) || rsns.length === 0) {
      return res.status(400).json({ error: 'No RSNs found for the user' });
    }

    console.log("User RSNs: ", rsns);

    // Fetch drops for the user's rsns
    const drops = await Drop.findAll({
      where: {
        rsn: { [Op.in]: rsns }
      },
      attributes: ['itemName', 'quantity', 'value', 'time']
    });

    const currentMonthPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);


    const totalDropsMonth = await Drop.sum('quantity', {
      where: {
        rsn: { [Op.in]: rsns },
        ym_partition: currentMonthPartition
      }
    });

    const totalDropsAllTime = await Drop.sum('quantity', {
      where: {
        rsn: { [Op.in]: rsns }
      }
    });


    // Calculate total value month
    const totalValueMonth = await Drop.findAll({
      where: {
        rsn: { [Op.in]: rsns },
        ym_partition: currentMonthPartition
      },
      attributes: [[Sequelize.literal('SUM(quantity * value)'), 'totalValueMonth']]
    });

    // Calculate total value all time
    const totalValueAllTime = await Drop.findAll({
      where: {
        rsn: { [Op.in]: rsns }
      },
      attributes: [[Sequelize.literal('SUM(quantity * value)'), 'totalValueAllTime']]
    });

    const userData = {
      ...user.toJSON(),
      drops,
      totalDropsMonth: formatValue(totalDropsMonth) || 0,
      totalDropsAllTime: formatValue(totalDropsAllTime) || 0,
      totalValueMonth: formatValue(totalValueMonth[0].dataValues.totalValueMonth) || 0,
      totalValueAllTime: formatValue(totalValueAllTime[0].dataValues.totalValueAllTime) || 0
    };

    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Fetch drop data for a user by user ID
router.get('/api/users/:userId/drops', async (req, res) => {
  const { userId } = req.params;
  console.log("Received request for drop data for user with id " + userId);

  try {
    // Fetch the user's rsns to identify their drops
    const user = await User.findByPk(userId, {
      attributes: ['rsns']  // Ensure 'rsns' is an array of RuneScape names associated with the user
    });

    if (!user || !Array.isArray(user.rsns) || user.rsns.length === 0) {
      return res.status(404).json({ error: 'User or RSNs not found' });
    }

    // Fetch drops using the rsns with filters for value and image url
    const drops = await Drop.findAll({
      where: {
        rsn: { [Op.in]: user.rsns },
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

{/* Clan Endpoints */}
router.post('/create-clan', async (req, res) => {
  const { displayName, discordServerId, description, clanType, womClanId, authedUsers, settings } = req.body;

  const t = await db.sequelize.transaction();
  console.log("Creating new server with ID" + discordServerId);
  try {
    // Create the clan
    const newClan = await Clan.create({
      displayName,
      discordServerId,
      description,
      clanType,
      womClanId,
      authedUsers
    }, { transaction: t });

    // Default settings
    const defaultSettings = {
      loot_leaderboard_message_id: "",
      loot_leaderboard_channel_id: "",
      channel_id_to_post_loot: "",
      only_send_drops_with_images: false,
      minimum_value_to_send_drop: 2500000,
      voice_channel_to_display_monthly_loot: "",
      voice_channel_to_display_wom_group_member_count: "",
      send_notifications_for_new_collection_logs: true,
      send_notifications_for_new_personal_bests: true,
      google_spreadsheet_id: ""
    };

    await ClanSettings.create({
      clanId: newClan.cid,
      settings: { ...defaultSettings, ...settings }
    }, { transaction: t });

    const defaultLootboardEmbed = {
          title: "Loot Leaderboard",
          description: `[Powered by DropTracker.io](https://www.droptracker.io/)`,
          color: 0xffffff, // Correct hex color representation
          fields: [
            {
              name: "Sign up!",
              value: "Download the [DropTracker](https://www.droptracker.io/runelite) RuneLite plugin!",
              inline: true
            },
            {
              name: "Members Tracked:",
              value: "0",
              inline: true
            },
            {
              name: "Need help?",
              value: "[Documentation](https://www.droptracker.io/documentation)\n[Join our Discord](https://www.droptracker.io/discord)",
              inline: false
            }
          ],
          footer: {
            text: "droptracker.io",
            icon_url: "https://www.droptracker.io/img/dt-logo.png"
          }
        };

        const defaultLootPostEmbed = {
          title: "{item_name}",
          description: `They've received a total of {player_total_month} gp this month.`,
          color: 0xffffff, // Ensure color is correctly formatted as an integer if used in JSON or use a string if the API accepts it
          image: {
            url: "{screenshot_url}"
          },
          fields: [
            {
              name: "{player_name}",
              value: "Clan Rank: {clan_rank_monthly}\nGlobal Rank: {global_rank}",
              inline: true
            },
            {
              name: "{clan_name}",
              value: "Total Loot: {total_clan_loot_month}\nRank: {clan_rank}/{total_clans} servers",
              inline: true
            }
          ],
          footer: {
            text: "droptracker.io",
            icon_url: "https://www.droptracker.io/img/dt-logo.png"
          }
        };

    await DiscordEmbed.create({
      clanId: newClan.cid,
      embedData: defaultLootboardEmbed,
      content: "",
      typeId: 1 
    }, { transaction: t });

    await DiscordEmbed.create({
      clanId: newClan.cid,
      embedData: defaultLootPostEmbed,
      content: "<@{player_id}> has submitted a drop:",
      typeId: 2
    }, { transaction: t });

    await t.commit();

    res.status(201).json({ message: 'Clan, settings, and embeds created successfully', clan: newClan });
  } catch (error) {
    await t.rollback();
    console.error('Error creating clan, settings, and embed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/get-clan-id', async (req, res) => {
    const { discordId } = req.query;
    try {
        const clan = await Clan.findOne({
            where: {
                discordServerId: discordId
            }
        });
        if (!clan) {
            return res.status(404).json({ message: 'Clan not found with this Discord ID' });
        }
        res.json({ cid: clan.cid });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Discord Embed for a specific clan and type
router.get('/get-clan-embed', async (req, res) => {
  const { clanId, typeId } = req.query; // Accept typeId in the query parameters

  try {
    const embed = await DiscordEmbed.findOne({
      where: { 
        clanId: clanId,
        type_id: typeId  // Ensure both clanId and typeId match the query
      }
    });

    if (!embed) {
      return res.status(404).json({ message: 'Embed not found for the specified clan ID and type ID' });
    }

    res.json(embed);
  } catch (error) {
    console.error('Error retrieving Discord embed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/get-clan-total', async (req, res) => {
  const { clanId } = req.query;
  if (!clanId) {
    return res.status(400).json({ message: 'Clan ID is required' });
  }

  try {
    const result = await GetClanTotal(clanId);
    console.log("Clan total grabbed:" + result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update or Create Discord Embed for a specific clan
router.post('/update-clan-embed', async (req, res) => {
  const { clanId, embedData, typeId } = req.body;

  const t = await db.sequelize.transaction();

  try {
    const existingEmbed = await DiscordEmbed.findOne({
      where: { clanId }
    }, { transaction: t });

    if (existingEmbed) {
      await existingEmbed.update({ embedData, typeId }, { transaction: t });
    } else {
      await DiscordEmbed.create({
        clanId,
        embedData,
        typeId
      }, { transaction: t });
    }

    await t.commit();
    res.json({ message: 'Embed updated successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error updating or creating Discord embed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
