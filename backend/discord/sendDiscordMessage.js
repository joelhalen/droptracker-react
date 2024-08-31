const axios = require('axios');
const { User, Clan, ClanSettings, Drop, DropTotal, Log, NewsPost, Notification, DiscordEmbed, RSAccount } = require('../../models');
const { rankLoot } = require('../utils/rankAllLoot');
const url = require('url');
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num;
};

// Helper function to replace placeholders in the embed template
const replacePlaceholders = (template, placeholders) => {
  const processObject = (obj) => {
    if (typeof obj === 'string') {
      Object.keys(placeholders).forEach(key => {
        if (key === "player_id") {
          const regex = new RegExp(`<@{${key}}>`,'g');
          if (placeholders[key] === 0) {
            obj = obj.replace(regex, placeholders["player_name"]);
          } else {
            obj = obj.replace(regex, `<@${placeholders[key]}>`);
          }
        } else {
          const regex = new RegExp(`{${key}}`, 'g');
          obj = obj.replace(regex, placeholders[key]);
        }
      });
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        obj[key] = processObject(obj[key]);
      }
    }
    return obj;
  };

  return processObject(JSON.parse(JSON.stringify(template)));
};



const sendNameChangeMessage = async(oldRsn, rsn, womId) => {
        const noticeChannelId = "1268310898540417145";
    const embed = {
      title: ':eyes: Player name changed :eyes:',
      description: '',
      color: 0x0099ff,
      fields: [
        {
          name: 'Changed to/from:',
          value: `${oldRsn}->${rsn}`,
          inline: false
        }, 
        {
          name: '__Player ID:__',
          value: `${womId}`,
          inline: true
        }
      ],
      timestamp: new Date()
    };
    const messagePayload = {
      embeds: [embed]
    };

    // Send the message to the log channel
    await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, messagePayload, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });
};

const validateUrl = (urlString) => {
  try {
    // Check if urlString is a JSON string
    if (urlString && urlString.startsWith('{') && urlString.endsWith('}')) {
      const parsedJson = JSON.parse(urlString);
      if (parsedJson.url) {
        urlString = parsedJson.url; // Extract the URL from the JSON object
      }
    }

    const parsedUrl = new URL(urlString);
    return parsedUrl.href;
  } catch (e) {
    console.error(`Invalid URL: ${urlString}`);
    return '';
  }
};

const sendDiscordLootMessage = async (guildId, channelId, drop, embedTemplate, contentTemplate) => {
  console.log("Called sendDiscordLootMessage with embedTemplate:", embedTemplate);
  console.log("And with contentTemplate:", contentTemplate);

  try {
    const { itemName, itemId, rsn, quantity, value, time, imageUrl, npcName } = drop;
    let playerDiscordId = 0;

    const rsAcc = await RSAccount.findOne({ where: { displayName: rsn } });
    if (!rsAcc) {
      throw new Error('RSAccount not found');
    }

    const user = await User.findOne({ where: { uid: rsAcc.userId } });
    if (user) {
      playerDiscordId = user.discordId;
    } else {
      playerDiscordId = 0;
    }

    const clan = await Clan.findOne({ where: { discordServerId: guildId } });
    if (!clan) {
      throw new Error('Clan not found');
    }
    const clanName = clan.displayName;

    const clanSettings = await ClanSettings.findOne({ where: { clanId: clan.cid } });
    if (!clanSettings) {
      throw new Error('Clan settings not found');
    }

    const playerRank = await rankLoot({ playerId: rsAcc.womId, clanId: clan.womClanId });
    const playerGlobalRank = await rankLoot({ playerId: rsAcc.womId });
    const clanRank = await rankLoot({ clanId: clan.womClanId });

    const placeholders = {
      item_name: itemName,
      player_id: playerDiscordId,
      item_id: itemId,
      player_name: rsn,
      player_total_month: formatNumber(playerRank.totalLoot),
      clan_rank_monthly: playerRank.rank,
      global_rank: playerGlobalRank.rank,
      total_clan_loot_month: formatNumber(clanRank.totalLoot),
      clan_rank: clanRank.rank,
      total_clans: clanRank.totalClans,
      clan_name: clanName,
      screenshot_url: validateUrl(imageUrl),
      kc: drop.kc || 0,
      sourceName: drop.sourceName || '',
      item_rarity: drop.itemRarity || '',
      achievement_name: drop.achievementName || '',
      task_tier: drop.taskTier || '',
      combat_points: drop.combatPoints || 0,
      current_tier: drop.currentTier || '',
      total_points: drop.totalPoints || 0,
      image_url: validateUrl(imageUrl)
    };

    console.log('Placeholders:', JSON.stringify(placeholders, null, 2));

    // Replace placeholders in the embed template and content
    let embed = replacePlaceholders(embedTemplate, placeholders);
    const content = contentTemplate ? replacePlaceholders(contentTemplate, placeholders) : '';

    // Log embed after replacing placeholders
    console.log('Embed after placeholders:', embed);

    // Ensure embed is an object
    let embedObject;
    try {
      embedObject = JSON.parse(embed);
    } catch (parseError) {
      console.error('Error parsing embed JSON:', parseError.message);
      console.error('Embed content:', embed);
      throw new Error('Failed to parse embed JSON');
    }

    // Validate and fix the embed structure
    embedObject = validateAndFixEmbed(embedObject);

    // Log embed and content
    console.log('Embed after validation:', JSON.stringify(embedObject, null, 2));
    console.log('Final content:', content);

    if (imageUrl) {
      embedObject.image.url = validateUrl(imageUrl);
    }
    const messagePayload = {
      content,
      embeds: [embedObject]
    };

    // Log message payload
    console.log('Message Payload:', JSON.stringify(messagePayload, null, 2));

    await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, messagePayload, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Message sent successfully to Discord channel');
  } catch (error) {
    console.error('Error sending message to Discord channel:', error);
    throw new Error('Failed to send message to Discord channel');
  }
};

// Validation and Fix Function
const validateAndFixEmbed = (embed) => {
  const validEmbed = {
    title: embed.title || '',
    description: embed.description || '',
    color: isValidColor(embed.color) ? embed.color : null,
    fields: Array.isArray(embed.fields) ? embed.fields.filter(isValidField) : [],
    footer: {
      text: embed.footer?.text || '',
      icon_url: validateUrl(embed.footer?.icon_url || '')
    },
    image: {
      url: validateUrl(embed.image?.url || '')
    },
    thumbnail: {
      url: validateUrl(embed.thumbnail?.url || '')
    }
  };

  // Remove empty objects/fields
  if (!validEmbed.footer.text && !validEmbed.footer.icon_url) delete validEmbed.footer;
  if (!validEmbed.image.url) delete validEmbed.image;
  if (!validEmbed.thumbnail.url) delete validEmbed.thumbnail;

  return validEmbed;
};

// Helper function to check if the field structure is valid
const isValidField = (field) => {
  return field && typeof field.name === 'string' && typeof field.value === 'string';
};

// Helper function to validate color
const isValidColor = (color) => {
  // Ensure color is a valid integer
  return typeof color === 'number' || /^[0-9A-F]{6}$/i.test(color);
};

const sendDiscordCollectionLogMessage = async (guildId, channelId, drop, embedTemplate, contentTemplate) => {
  try {
    const { itemName, itemId, rsn, kc, sourceName, itemRarity, imageUrl } = drop;

    const rsAcc = await RSAccount.findOne({ where: { displayName: rsn } });
    if (!rsAcc) {
      throw new Error('RSAccount not found');
    }

    const user = await User.findOne({ where: { uid: rsAcc.userId } });
    if (!user) {
      throw new Error('User not found');
    }
    const playerDiscordId = user.discordId;
    console.log("Found player ID " + playerDiscordId);

    const clan = await Clan.findOne({ where: { discordServerId: guildId } });
    if (!clan) {
      throw new Error('Clan not found');
    }
    const clanName = clan.displayName;

    const placeholders = {
      item_name: itemName,
      item_id: itemId,
      player_name: rsn,
      player_id: playerDiscordId,
      kc: kc || 0,
      sourceName: sourceName || '',
      item_rarity: itemRarity || '',
      image_url: imageUrl || '',
      thumbnail_url: `https://www.droptracker.io/img/itemdb/${itemId}.png`
    };

    const embed = replacePlaceholders(embedTemplate, placeholders);
    const content = contentTemplate ? replacePlaceholders(contentTemplate, placeholders) : '';

    console.log('Embed:', JSON.stringify(embed, null, 2));
    console.log('Content:', content);
    embed.thumbnail = { url: placeholders.thumbnail_url };
    embed.image_url = imageUrl;
    const messagePayload = {
      content,
      embeds: [embed]
    };
    console.log('Message Payload:', JSON.stringify(messagePayload, null, 2));


    await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, messagePayload, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    console.log('Message sent successfully to Discord channel');
  } catch (error) {
    console.error('Error sending message to Discord channel:', error);
    throw new Error('Failed to send message to Discord channel');
  }
};

const sendDiscordLootboardMessage = async (guildId, channelId, data, embedTemplate, contentTemplate) => {
  try {
    const placeholders = {
      total_members: data.totalMembers || 0,
      next_update: data.nextUpdate || 'N/A'
    };

    const embed = replacePlaceholders(embedTemplate, placeholders);
    const content = contentTemplate ? replacePlaceholders(contentTemplate, placeholders) : '';
    if (data.imageUrl) {
      embed.image_url = data.imageUrl;
    }
    const messagePayload = {
      content,
      embeds: [embed]
    };

    await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, messagePayload, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    console.log('Message sent successfully to Discord channel');
  } catch (error) {
    console.error('Error sending message to Discord channel:', error);
    throw new Error('Failed to send message to Discord channel');
  }
};

const sendDiscordCombatAchievementMessage = async (guildId, channelId, drop, embedTemplate, contentTemplate) => {
  try {
    const { rsn, achievementName, taskTier, combatPoints, currentTier, totalPoints, imageUrl } = drop;

    const rsAcc = await RSAccount.findOne({ where: { displayName: rsn } });
    if (!rsAcc) {
      throw new Error('RSAccount not found');
    }

    const user = await User.findOne({ where: { uid: rsAcc.userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const clan = await Clan.findOne({ where: { discordServerId: guildId } });
    if (!clan) {
      throw new Error('Clan not found');
    }
    const clanName = clan.displayName;

    const placeholders = {
      achievement_name: achievementName,
      task_tier: taskTier,
      player_name: rsn,
      combat_points: combatPoints,
      current_tier: currentTier,
      total_points: totalPoints,
      image_url: imageUrl || ''
    };

    const embed = replacePlaceholders(embedTemplate, placeholders);
    const content = contentTemplate ? replacePlaceholders(contentTemplate, placeholders) : '';

    const messagePayload = {
      content,
      embeds: [embed]
    };

    if (imageUrl) {
      messagePayload.files = [{ attachment: imageUrl }];
    }

    await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, messagePayload, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    console.log('Message sent successfully to Discord channel');
  } catch (error) {
    console.error('Error sending message to Discord channel:', error);
    throw new Error('Failed to send message to Discord channel');
  }
};

const sendDirectMessageWithEmbed = async (userId, token) => {
  try {
    // Fetch the user from the database
    const user = await User.findOne({ where: { uid: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const playerDiscordId = user.discordId;

    // Construct the embed and content
    const embed = {
      title: ':tada: Thanks for Registering! :tada:',
      description: '',
      color: 0x0099ff,
      fields: [
        {
          name: 'What now?',
          value: 'You have been assigned a unique authentication token:\n\n`' + token + '`\n\nThis will be required for any of your accounts from now on.\nYou can retrieve this any time, using `/token`\nYou can [Claim your Accounts](https://www.droptracker.io/welcome) on our website & join our [Discord](https://discord.gg/droptracker) server!',
          inline: true
        }, // TODO -- Fix /token command so it's clickable
        {
          name: '<:communityserver:1263916328981495809> Running a Clan?',
          value: 'We would love to have you as a part of our global database!\nYou can learn more about the process via our [Documentation](https://www.droptracker.io/documentation)',
          inline: true
        },
        {
          name: '<:link:1213802517780111380> __Important Links__ <:link:1213802517780111380>',
          value: '| [Docs](https://www.droptracker.io/documentation) | [Discord](https://www.discord.gg/droptracker) | [Website](https://www.droptracker.io/) | [Patreon](https://patreon.com/droptracker) |',
          inline: true
        }
      ],
      footer: {
        text: 'Powered by https://www.droptracker.io/'
      },
      timestamp: new Date()
    };

    const content = 'Hey, <@' + userId + '>,\nYour Discord account has been added to the DropTracker database.';

    const messagePayload = {
      content,
      embeds: [embed]
    };

    // Send the direct message to the user
    await axios.post(`https://discord.com/api/v9/users/${playerDiscordId}/messages`, messagePayload, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    console.log('Message sent successfully to Discord user');
  } catch (error) {
    console.error('Error sending message to Discord user:', error);
    throw new Error('Failed to send message to Discord user');
  }
};


module.exports = {
  sendDiscordLootMessage,
  sendDiscordCollectionLogMessage,
  sendDiscordLootboardMessage,
  sendDiscordCombatAchievementMessage,
  sendDirectMessageWithEmbed
};
