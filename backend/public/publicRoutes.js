// backend/public/publicRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { WOMClient } = require('@wise-old-man/utils');
const mysql = require('mysql2/promise');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });
const { sendMessageToAllClients, sendMessageToLocalClients } = require('../utils/websocketMessageAll');
const axios = require('axios'); // Add this line

const womclient = new WOMClient({
  userAgent: '@joelhalen -discord'
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SECRET_KEY = process.env.SECRET_KEY;

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;


// Create a connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = { id: 'user-id', email };
  const token = jwt.sign(user, process.env.SECRET_KEY);
  res.json({ user, token });
});

router.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  console.log('Received code from Discord:', code);

  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI,
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

    const [rows] = await pool.execute('SELECT * FROM users WHERE discordId = ?', [discordUser.id]);
    let isNewUser = false;
    let user;

    if (rows.length === 0) {
      const email = discordUser.email || '';
      const [result] = await pool.execute(
        'INSERT INTO users (displayName, discordId, email) VALUES (?, ?, ?)',
        [discordUser.username, discordUser.id, email]
      );
      user = { id: result.insertId, displayName: discordUser.username, discordId: discordUser.id, email: email };
      isNewUser = true;
      const type = 'send_message';
      const targetChannel = null;
      const targetUser =  discordUser.id;
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
    } else {
      user = rows[0];
    }

    console.log('User record from database:', user);

    const token = jwt.sign({ id: user.id, username: user.displayName, email: user.email }, process.env.SECRET_KEY);

    if (isNewUser) {
      res.redirect(`http://droptracker.io:21222?token=${token}&new=true`);

    } else {
      res.redirect(`http://droptracker.io:21222?token=${token}`);
    }
  } catch (error) {
    console.error('Error during Discord OAuth2 callback:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log('Decoded token:', decodedToken);

    const [rows] = await pool.execute('SELECT uid, displayName as username, email, discordId FROM users WHERE email = ?', [decodedToken.email]);

    if (rows.length > 0) {
      const user = rows[0];
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

router.get('/notifications', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.SECRET_KEY, async (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    try {
      const [notifications] = await pool.execute(
        'SELECT * FROM notifications WHERE userId = ? OR isGlobal = true ORDER BY createdAt DESC',
        [user.id]
      );
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });
});

router.post('/api/notifications', async (req, res) => {
  const { userId, message, type, isGlobal } = req.body;
  if (!message || !type || isGlobal === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await pool.execute(
      'INSERT INTO notifications (userId, message, type, isGlobal) VALUES (?, ?, ?, ?)',
      [isGlobal ? null : userId, message, type, isGlobal]
    );
    res.status(201).json({ message: 'Notification created successfully' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.get('/api/get-user-rsns', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'UserId is required' });
  }

  try {
    const [rows] = await pool.execute('SELECT rsns FROM users WHERE discordId = ?', [userId]);
    if (rows.length > 0) {
      const userRSNs = JSON.parse(rows[0].rsns);
      res.json({ rsns: userRSNs });
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
    const [rows] = await pool.execute('SELECT rsns, wiseOldManIds FROM users');
    const lowerCasedRSN = rsn.toLowerCase();
    let womId = null;
    let isUnique = true;
    let overallLevel = null;
    let ehb = null;
    let ehp = null;

    for (const row of rows) {
      const rsns = JSON.parse(row.rsns);
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

        const [userRows] = await pool.execute('SELECT rsns, wiseOldManIds, uid FROM users WHERE discordId = ?', [userId]);

        console.log('Fetched userRows:', userRows);

        if (userRows.length > 0) {
          let userRSNs = JSON.parse(userRows[0].rsns);
          let userWomIds = JSON.parse(userRows[0].wiseOldManIds);
          let userDroptrackerId = userRows[0].uid;

          console.log('Parsed userRSNs:', userRSNs);
          console.log('Parsed userWomIds:', userWomIds);

          userRSNs.push(rsn);
          userWomIds.push(womId);

          console.log('Updating user with new RSN and WOM ID:', {
            rsns: userRSNs,
            wiseOldManIds: userWomIds,
            userId
          });

          const [updateResult] = await pool.execute('UPDATE users SET rsns = ?, wiseOldManIds = ? WHERE discordId = ?', [
            JSON.stringify(userRSNs),
            JSON.stringify(userWomIds),
            userId
          ]);

          console.log('Update query result:', updateResult);

          const insertLogQuery = `
            INSERT INTO logs (event_type, description, event_id, user_id, additional_data)
            VALUES (?, ?, ?, ?, ?);
          `;
          await pool.execute(insertLogQuery, [
            "rsn claimed",
            `${userId} has claimed ${rsn} (womId: ${womId})`,
            2,
            userDroptrackerId,
            JSON.stringify({ rsn, womId, overallLevel, ehb, ehp })
          ]);
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
    const [topPlayers] = await pool.execute(`
      SELECT 
        d.rsn,
        SUM(d.value * d.quantity) AS total_value,
        u.uid,
        u.displayName
      FROM 
        drops d
      LEFT JOIN 
        users u ON JSON_CONTAINS(u.rsns, JSON_QUOTE(d.rsn), '$')
      WHERE 
        d.time >= NOW() - INTERVAL 7 DAY
      GROUP BY 
        d.rsn, u.uid, u.displayName
      ORDER BY 
        total_value DESC
      LIMIT 10
    `);

    const formattedPlayers = topPlayers.map(player => {
      const formattedValue = formatValue(player.total_value);
      return {
        rsn: player.rsn,
        totalValue: formattedValue,
        registered: !!player.uid,
        userId: player.uid || null,
        displayName: player.displayName || null
      };
    });

    cache.set(cacheKey, formattedPlayers);

    res.json(formattedPlayers);
  } catch (error) {
    console.error('Error fetching top players by drops:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const formatValue = (value) => {
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
    const [recentDrops] = await pool.execute(`
      SELECT 
        item_id,
        rsn,
        item_name, 
        npc_name,
        time,
        SUM(value * quantity) AS total_value,
        SUM(quantity) AS total_quantity_month,
        (SELECT SUM(quantity) FROM drops WHERE item_id = d.item_id) AS total_quantity_all_time
      FROM drops d
      WHERE ym_partition = YEAR(CURRENT_DATE()) * 100 + MONTH(CURRENT_DATE())
      GROUP BY item_id, item_name, time
      HAVING total_value > ?
      ORDER BY time DESC
      LIMIT 10
    `, [minDropValue]);

    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] * 1e9 + endTime[1]) / 1e6;

    const formattedDrops = recentDrops.map(drop => ({
      ...drop,
      total_value: formatValue(drop.total_value),
      total_quantity_month: formatValue(drop.total_quantity_month),
      total_quantity_all_time: formatValue(drop.total_quantity_all_time)
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
    const [valuableLoots] = await pool.execute(`
      SELECT 
        item_id, 
        item_name, 
        SUM(value * quantity) AS total_value,
        SUM(quantity) AS total_quantity_month,
        (SELECT SUM(quantity) FROM drops WHERE item_id = d.item_id) AS total_quantity_all_time
      FROM drops d
      WHERE ym_partition = YEAR(CURRENT_DATE()) * 100 + MONTH(CURRENT_DATE())
      GROUP BY item_id, item_name
      ORDER BY total_value DESC
      LIMIT 10
    `);

    const formattedLoots = valuableLoots.map(loot => ({
      ...loot,
      total_value: formatValue(loot.total_value),
      total_quantity_month: formatValue(loot.total_quantity_month),
      total_quantity_all_time: formatValue(loot.total_quantity_all_time)
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
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) AS totalDropCtMonth,
        SUM(value) AS lootThisMonth,
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM users WHERE discordId != 0) AS pluginUsers
      FROM drops
      WHERE time >= DATE_FORMAT(NOW() ,'%Y-%m-01')
    `);

    const formattedStats = {
      ...stats[0],
      totalDropCtMonth: formatValue(stats[0].totalDropCtMonth),
      lootThisMonth: formatValue(stats[0].lootThisMonth),
      totalUsers: formatValue(stats[0].totalUsers),
      pluginUsers: formatValue(stats[0].pluginUsers)
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
    const [newsPosts] = await pool.execute(`
      SELECT id, title, content, post_type, pinned, image_url, video_url, timestamp 
      FROM news_posts
      ORDER BY pinned DESC, timestamp DESC
    `);

    cache.set(cacheKey, newsPosts);

    res.json(newsPosts);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
