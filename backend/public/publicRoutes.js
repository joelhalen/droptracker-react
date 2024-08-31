const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const { WOMClient } = require('@wise-old-man/utils');
const multer = require('multer');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });
const path = require('path');
const { sendMessageToAllClients, sendMessageToLocalClients } = require('../utils/websocketMessageAll');
const axios = require('axios');
const db = require('../../models');
const { User, Clan, Drop, DropTotal, Log, NewsPost, Notification, ClanSettings, DiscordEmbed, RSAccount, ClanMembers } = require('../../models');
const { GetClanTotal, getAllItems } = require('../utils/GetClanTotal');
const { handleDropRequest } = require('../utils/websocket');
const { v4: uuidv4 } = require('uuid');

const { Sequelize, Op } = require('sequelize');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const womclient = new WOMClient({
  authKey: process.env.WOM_API_KEY,
  userAgent: '@joelhalen -discord'
});

// Function to generate a unique filename
const generateUniqueFilename = (directory, fileName, ext) => {
    let baseName = fileName;
    let counter = 1;
    let uniqueFileName = `${baseName}.${ext}`;
    while (fs.existsSync(path.join(directory, uniqueFileName))) {
        uniqueFileName = `${baseName}_${counter}.${ext}`;
        counter++;
    }
    return uniqueFileName;
};

router.post('/upload_image', upload.single('file'), async (req, res) => {
    try {
        const { server_id, player_name, npc } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).send('No file uploaded.');
        }

        const imgType = 'drop';
        const ext = path.extname(file.originalname).slice(1); // Get the file extension
        const fileName = path.parse(file.originalname).name;

        const baseDir = path.join(__dirname, '..', '..', 'public', 'img', 'user-upload');
        const directoryPath = path.join(baseDir, player_name, imgType);

        console.log("Ensuring directory exists: ", directoryPath);
        await fs.ensureDir(directoryPath); // Use the async version of ensureDir

        const uniqueFileName = generateUniqueFilename(directoryPath, fileName, ext);
        const filePath = path.join(directoryPath, uniqueFileName);

        // Save the uploaded file to the unique file path
        await fs.writeFile(filePath, file.buffer);

        // Generate a publicly accessible URL for the uploaded file
        const fileUrl = `https://www.droptracker.io/img/user-upload/${player_name}/${imgType}/${uniqueFileName}`;
        console.log("Generated image URL: " + fileUrl);
        console.log("Base directory:", baseDir);
        console.log("Target directory:", directoryPath);
        res.status(200).send({ url: fileUrl });
    } catch (error) {
        console.error('Error handling upload:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/drops/submit', async (req, res) => {
    //console.log("/drops/submit");
    //console.log("Request headers:", req.headers);
    //console.log("Request body:", JSON.stringify(req.body, null, 2));

    const {
        drop_type,
        auth_token,
        item_name,
        item_id,
        player_name,
        real_name,
        server_id,
        quantity,
        value,
        nonmember,
        member_list,
        image_url,
        npc_name,
        webhook,
        webhookValue,
        sheet,
        notified
    } = req.body;

    const drop = {
        itemName: item_name,
        itemId: item_id,
        rsn: player_name,
        quantity,
        value,
        time: new Date(),
        notified,
        imageUrl: image_url,
        npcName: npc_name,
        sheetUrl: sheet,
        token: auth_token
    };

    // console.log("Drop data:", JSON.stringify(drop, null, 2));

    try {
        const result = await handleDropRequest(drop, process.env.SECRET_KEY);
        if (result.error) {
            res.status(400).json(result);
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        //console.error('Error handling drop request:', error);
        res.status(500).json({ error: 'Internal server error' });
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


        {/* data response functions */}



router.get('/get-total-players', async (req, res) => {
    const { authKey, clanId, discordId } = req.query;

    if (authKey !== process.env.SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid auth key' });
    }

    try {
        let userCount = 0;
        if (discordId) {
            console.log("DiscordId" + discordId);
            const clan = await Clan.findOne({
                where: {
                    discordServerId: discordId
                }
            });
            if (clan) {
                userCount = await ClanMembers.count({
                    where: {clanId: parseInt(clan.womClanId, 10)}
                });
            }
            console.log("Found clan (" + clan.cid + "), user count is: " + userCount);
        } else if (clanId) {
            // Get the count of users for a specific clanId
            userCount = await ClanMembers.count({
                where: { clanId: parseInt(clanId, 10) }
            });
        } else {

            userCount = await RSAccount.count();
        }

        res.json({ count: userCount });
    } catch (error) {
        console.error('Error fetching user count:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.get('/get-loot-total', async (req, res) => {
  const { clanId, clanWomId, discordServerId, playerId, rsn, userUid, discordId, startTime, endTime } = req.query;

  if (!clanId && !clanWomId && !discordServerId && !playerId && !rsn && !userUid && !discordId) {
    return res.status(400).json({ message: 'At least one identifier is required' });
  }

  // Log the incoming request parameters and headers
  // console.log('Received request query:', req.query);
  // console.log('Received request headers:', req.headers);

  const identifiers = {
    clanId: clanId ? parseInt(clanId, 10) : undefined,
    clanWomId: clanWomId ? parseInt(clanWomId, 10) : undefined,
    discordServerId,
    playerId: playerId ? parseInt(playerId, 10) : undefined,
    rsn,
    userUid: userUid ? parseInt(userUid, 10) : undefined,
    discordId
  };

  const timeframe = {
    startTime: startTime ? new Date(startTime) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endTime: endTime ? new Date(endTime) : new Date()
  };

  try {
    const result = await GetClanTotal(identifiers, timeframe);
    res.json(result);
  } catch (error) {
    console.error('Error fetching clan total loot:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/get-all-items', async (req, res) => {
  const { clanId, userId, startTime, endTime } = req.query;

  if (!clanId && !userId) {
    return res.status(400).json({ message: 'clanId or userId is required' });
  }

  // Log the incoming request parameters and headers
  console.log('Received request query:', req.query);
  console.log('Received request headers:', req.headers);

  const identifiers = {
    clanId: clanId ? parseInt(clanId, 10) : undefined,
    userId: userId ? parseInt(userId, 10) : undefined
  };

  const timeframe = {
    startTime: startTime ? new Date(startTime) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endTime: endTime ? new Date(endTime) : new Date()
  };

  try {
      console.log("Getting result");
    const result = await getAllItems(identifiers, timeframe);
    res.json(result);
  } catch (error) {
    console.error('Error fetching all items:', error);
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
