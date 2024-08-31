const express = require('express');
const router = express.Router();
const { User, Clan, Drop, DropTotal, Log, NewsPost, Notification, ClanSettings, DiscordEmbed, RSAccount } = require('../../models');
const crypto = require('crypto');

router.get('/get-rsn', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'UserId is required' });
  }

  try {
    const user = await User.findOne({ where: { discordId: userId } });
    if (user) {
      const userRSAccounts = await RSAccount.findAll({
        where: {
          userId: user.uid
        }
      });

      if (userRSAccounts.length > 0) {
        const displayNames = userRSAccounts.map(account => account.displayName);
        return res.json({ rsns: displayNames });
      } else {
        return res.status(404).json({ error: 'No RSAccounts found for this user' });
      }
    } else {
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user RSNs:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/get-id', async (req, res) => {
    const { discordId } = req.query;
    console.log("Get id called with discordId " + discordId);
    try {
        const player = await User.findOne({
            where: {
                discordId: discordId
            }
        });
        if (!player) {
            return res.status(404).json({ message: 'Player not found.' });

        }
        res.json({ uid: player.uid });

    } catch (error) {
        res.status(500).json({ message: 'Server unavailable', error: error.message });
    }
});


router.post('/create', async (req, res) => {
    const { discordId, displayName, email, authKey } = req.query;
    if (authKey !== process.env.SECRET_KEY) {
        return res.status(503).json({ error: 'You are not authenticated to do that.' });
    }

    if (!discordId || !displayName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = generateTokenHex(16);

    try {
        const existingUser = await User.findOne({
            where: {
                discordId: discordId
            }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'Discord ID already exists' });
        }

        const user = await User.create({
            displayName: displayName,
            discordId: discordId,
            email: email || null,  
            token: token
        });


        res.json({ userId: user.uid, token: user.token });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function generateTokenHex(length) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = router;
