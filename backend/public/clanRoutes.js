const express = require('express');
const { Sequelize, Op } = require('sequelize');
const { womclient, rateLimitedWomClientCall } = require('../wom/wom');
const router = express.Router(); // Instantiate the router correctly
const db = require('../../models');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const axios = require('axios');
const { restrictToLocalhost, verifyToken } = require('../utils/middleware');
const { User, Clan, Drop, DropTotal, Log, NewsPost, Notification, ClanSettings, DiscordEmbed } = require('../../models');
const SECRET_KEY = process.env.SECRET_KEY;
const sequelize = require('sequelize');

router.get('/get-settings', async (req, res) => {
  const { clanId, discordId, authKey } = req.query;

  // Validation to ensure at least one identifier is provided
  if (!clanId && !discordId) {
    return res.status(400).json({ message: 'Either clanId or discordId must be provided' });
  }

  // Determine the attribute to use for searching the Clan
  const searchCriteria = clanId ? { cid: clanId } : { discordServerId: discordId };

  try {
    const clan = await Clan.findOne({ where: searchCriteria });

    if (!clan) {
      const missingId = clanId ? `clanId: ${clanId}` : `discordId: ${discordId}`;
      return res.status(404).json({ message: `Clan not found with ${missingId}` });
    }

    const womId = clan.womClanId;
    let clanSettings = await ClanSettings.findOne({ where: { clanId: clan.cid } });

    // If settings do not exist, create default settings
    if (!clanSettings) {
      console.log("Clan settings do not exist. Creating new settings");
      clanSettings = await ClanSettings.create({ clanId: clan.cid });
    }

    const clanName = clan.displayName;

    res.json({
      clanSettings: clanSettings.settings,
      womId: womId,
      clanName: clanName,
      clanId: clan.cid
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/update-loot-leaderboard-message-id', async (req, res) => {
  const { clanId } = req.query;
  const { loot_leaderboard_message_id } = req.body;

  if (!clanId) {
    return res.status(400).json({ message: 'clanId must be provided' });
  }

  if (!loot_leaderboard_message_id) {
    return res.status(400).json({ message: 'loot_leaderboard_message_id must be provided' });
  }

  try {
    const clan = await Clan.findOne({ where: { cid: clanId } });

    if (!clan) {
      return res.status(404).json({ message: `Clan not found with clanId: ${clanId}` });
    }
    console.log("Current clan womClanId:", clan.womClanId);
    const womId = settings.womId;
    const parsedWomId = parseInt(womId, 10);
    if (isNaN(parsedWomId)) {
      console.error("Invalid womId format:", womId);
      return res.status(400).json({ message: 'Invalid womId format' });
    }

    if (parsedWomId !== clan.womClanId) {
      clan.womClanId = parsedWomId;
      await clan.save(); // Ensure the clan object is saved
      console.log("Updated clan womClanId to:", clan.womClanId);
    } else {
      console.log("No change in womClanId, skipping save.");
    }

    let clanSettings = await ClanSettings.findOne({ where: { clanId: clan.cid } });

    // Update the loot_leaderboard_message_id parameter
    clanSettings.settings.loot_leaderboard_message_id = loot_leaderboard_message_id;

    await clanSettings.save();

    res.json({ message: 'loot_leaderboard_message_id updated successfully' });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/update-config', async (req, res) => {
  const { clanId } = req.query;
  const { settings, embeds } = req.body;

  if (!clanId) {
    return res.status(400).json({ message: 'clanId must be provided' });
  }

  console.log("Received settings:", settings); // Log the received settings

  try {
    const clan = await Clan.findOne({ where: { cid: clanId } });

    if (!clan) {
      return res.status(404).json({ message: `Clan not found with clanId: ${clanId}` });
    }
    console.log("Current clan womClanId:", clan.womClanId);
    const womId = settings.womId;
    const parsedWomId = parseInt(womId, 10);
    if (isNaN(parsedWomId)) {
      console.error("Invalid womId format:", womId);
      return res.status(400).json({ message: 'Invalid womId format' });
    }

    if (parsedWomId !== clan.womClanId) {
      clan.womClanId = parsedWomId;
      await clan.save(); // Ensure the clan object is saved
      console.log("Updated clan womClanId to:", clan.womClanId);
    } else {
      console.log("No change in womClanId, skipping save.");
    }

    let clanSettings = await ClanSettings.findOne({ where: { clanId: clan.cid } });

    if (!clanSettings) {
      return res.status(404).json({ message: 'Clan settings not found' });
    }

    // Ensure settings is a valid object
    let parsedSettings;
    try {
      parsedSettings = typeof settings === 'string' ? JSON.parse(settings) : settings;
    } catch (error) {
      console.error('Failed to parse settings string:', settings, error);
      return res.status(400).json({ message: 'Invalid settings format' });
    }

    console.log("Parsed settings object:", parsedSettings); // Log the parsed settings

    // Merge the settings with the default ones, ensuring no unwanted keys are included
    const defaultSettings = {
      loot_leaderboard_message_id: "",
      loot_leaderboard_channel_id: "",
      channel_id_to_post_loot: "",
      only_send_drops_with_images: false,
      only_send_drops_with_one_item: true,
      only_show_drops_above_threshold_on_lootboard: false,
      loot_board_style: 1,
      minimum_value_to_send_drop: 2500000,
      voice_channel_to_display_monthly_loot: "",
      monthly_loot_channel_update_text: "{month}: {gp_amount} gp",
      voice_channel_to_display_wom_group_member_count: "",
      wom_group_member_count_update_text: "{member_count} members",
      send_notifications_for_new_collection_logs: true,
      send_notifications_for_new_personal_bests: true,
      send_notifications_for_new_combat_achievements: true,
      google_spreadsheet_id: "",
      discord_invite_link: "",
      clan_chat_name: ""
    };

    const newSettings = {
      ...defaultSettings,
      ...parsedSettings
    };

    console.log("Formatted settings object before saving:", newSettings); // Log the formatted settings object

    // Validate the structure of the new settings object
    if (!isValidSettingsObject(newSettings)) {
      console.error('Formatted settings object structure is invalid:', newSettings);
      return res.status(400).json({ message: 'Formatted settings object structure is invalid' });
    }

    clanSettings.settings = newSettings; // Directly assign the object

    await clanSettings.save();

    // Update embeds if necessary
    for (const [embedKey, embedValue] of Object.entries(embeds)) {
      const typeId = parseInt(embedKey.replace('embed', ''), 10); // Extract the integer from the key
      const embed = await DiscordEmbed.findOne({ where: { clanId: clan.cid, type_id: typeId } });
      if (embed) {
        embed.embedData = JSON.stringify(embedValue.embedData); // Ensure the embedData is a properly formatted JSON string
        embed.content = embedValue.content;
        await embed.save();
      } else {
        await DiscordEmbed.create({
          clanId: clan.cid,
          type_id: typeId,
          embedData: JSON.stringify(embedValue.embedData), // Ensure the embedData is a properly formatted JSON string
          content: embedValue.content,
        });
      }
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Utility function to validate the settings object
function isValidSettingsObject(settings) {
  if (typeof settings !== 'object' || Array.isArray(settings)) {
    return false;
  }

  const keys = [
    'clan_chat_name', 'discord_invite_link', 'google_spreadsheet_id', 'only_send_drops_with_images',
    'only_send_drops_with_one_item', 'only_show_drops_above_threshold_on_lootboard', 'loot_board_style',
    'minimum_value_to_send_drop', 'send_notifications_for_new_collection_logs', 'send_notifications_for_new_personal_bests',
    'send_notifications_for_new_combat_achievements', 'loot_leaderboard_channel_id', 'loot_leaderboard_message_id',
    'channel_id_to_post_loot', 'voice_channel_to_display_wom_group_member_count', 'voice_channel_to_display_monthly_loot',
    'monthly_loot_channel_update_text', 'wom_group_member_count_update_text'
  ];

  return keys.every(key => key in settings);
}


router.get('/check-auth', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ auth: false, message: 'No token provided' });
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
      return res.status(404).json({ auth: false, message: 'User not found' });
    }

    const userDiscordId = user.discordId;

    // Adjust query to use JSON_CONTAINS
    const userClans = await Clan.findAll({
      where: {
        authedUsers: {
          [Op.or]: [
            { [Op.like]: `%${userDiscordId}%` }, // Fallback for substring search if JSON_CONTAINS is not supported
            sequelize.where(
              sequelize.fn('JSON_CONTAINS', sequelize.col('authedUsers'), JSON.stringify([userDiscordId])),
              true
            )
          ]
        }
      }
    });

    if (!userClans || userClans.length === 0) {
      return res.status(404).json({ auth: false, message: 'Not authorized to access any clans.' });
    }

    return res.json({ auth: true, clans: userClans });

  } catch (error) {
    console.error('Error checking authentication:', error);
    return res.status(500).json({ auth: false, message: 'Internal Server Error' });
  }
});



// Update or Create Discord Embed for a specific clan
router.post('/update-embed', async (req, res) => {
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


// Get Discord Embed for a specific clan and type
router.get('/get-embed', async (req, res) => {
  const { clanDTId, typeId } = req.query;
  try {
    const embed = await DiscordEmbed.findOne({
      where: { 
        clanId: clanDTId,
        type_id: typeId  
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


router.get('/get-id', async (req, res) => {
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


{/* Clan Endpoints */}

router.post('/create', async (req, res) => {
  const { displayName, discordServerId, description, clanType, womClanId, authedUsers, settings, authKey } = req.body;
  if (authKey !== process.env.SECRET_KEY) {
      return res.status(401).json({ message: 'No authorization to create a new clan with your authKey.' });
  }
  const t = await db.sequelize.transaction();
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
        only_send_drops_with_one_item: true,
        only_show_drops_above_threshold_on_lootboard: false,
        loot_board_style: 1,
        minimum_value_to_send_drop: 2500000,
        voice_channel_to_display_monthly_loot: "",
        monthly_loot_channel_update_text: "{month}: {gp_amount} gp",
        voice_channel_to_display_wom_group_member_count: "",
        wom_group_member_count_update_text: "{member_count} members",
        send_notifications_for_new_collection_logs: true,
        send_notifications_for_new_personal_bests: true,
        send_notifications_for_new_combat_achievements: true,
        google_spreadsheet_id: "",
        discord_invite_link: "",
        clan_chat_name: ""
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
              value: "{total_members}",
              inline: true
            },
            {
              name: "Need help?",
              value: "[Documentation](https://www.droptracker.io/documentation)\n[Join our Discord](https://www.droptracker.io/discord)",
              inline: true
            },
            {
              name: "Next update:",
              value: "{next_update}",
              inline: true
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
      color: 0xffffff, 
      image: {
        url: "{screenshot_url}"
      },
      thumbnail: {
        url: "https://www.droptracker.io/img/itemdb/{item_id}.png"
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

    const defaultCollectionLogEmbed = {
      title: "{item_name}",
      description: `They have a total of {kc} KC at {sourceName}`,
      color: 0xffffff, 
      image: {
        url: "{image_url}"
      },
      thumbnail: {
        url: "https://www.droptracker.io/img/itemdb/{item_id}.png"
      },
      fields: [
        {
          name: "Rarity",
          value: "{item_rarity}",
          inline: true
        }
      ],
      footer: {
        text: "droptracker.io",
        icon_url: "https://www.droptracker.io/img/dt-logo.png"
      }
    };

    const defaultCombatAchievementEmbed = {
      title: "{achievement_name} ({task_tier})",
      description: `They have a total of {combat_points} points.`,
      color: 0xffffff,
      image: {
          url: "{image_url}"
      },
      fields: [
          {
              name: "Current Tier Achieved",
              value: "{current_tier}",
              inline: true
          },
          {
              name: "Total Points",
              value: "{total_points}",
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
      type_id: 1 
    }, { transaction: t });

    await DiscordEmbed.create({
      clanId: newClan.cid,
      embedData: defaultLootPostEmbed,
      content: "<@{player_id}> has submitted a drop:",
      type_id: 2
    }, { transaction: t });
    
    await DiscordEmbed.create({
        clanId: newClan.cid,
        embedData: defaultCollectionLogEmbed,
        content: "<@{player_id}> has received a new Collection Log slot:",
        type_id: 3
    }, { transaction: t });

    await DiscordEmbed.create({
        clanId: newClan.cid,
        embedData: defaultCombatAchievementEmbed,
        content: "<@{player_id}> has completed a new Combat Task:",
        type_id: 4
    }, { transaction: t });

    await t.commit();

    res.status(201).json({ message: 'Clan, settings, and embeds created successfully', clan: newClan });
  } catch (error) {
    await t.rollback();
    console.error('Error creating clan, settings, and embed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;