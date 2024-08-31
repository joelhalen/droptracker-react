const axios = require('axios');
const { client } = require('../redis/redisClient');

const fetchDiscordChannels = async (guildId) => {
  console.log("fetchDiscordChannels called");
  try {
    const response = await axios.get(`https://discord.com/api/v9/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    const channels = response.data.map(channel => ({
      id: channel.id,
      name: channel.name,
      type: channel.type
    }));

    return channels;
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw new Error('Failed to fetch channels');
  }
};

const getVoiceChannels = async (guildId) => {
  console.log("getVoiceChannels called");
  const cacheKey = `voiceChannels:${guildId}`;
  try {
    const cachedChannels = await client.get(cacheKey);
    if (cachedChannels) {
      return JSON.parse(cachedChannels);
    }

    const channels = await fetchDiscordChannels(guildId);
    const voiceChannels = channels.filter(channel => channel.type === 2); // 2 is the type for voice channels

    await client.setEx(cacheKey, 300, JSON.stringify(voiceChannels)); // Cache for 5 minutes (300 seconds)

    return voiceChannels;
  } catch (error) {
    console.error('Error fetching voice channels:', error);
    throw new Error('Failed to fetch voice channels');
  }
};

const getTextChannels = async (guildId) => {
  console.log("getTextChannels called");
  const cacheKey = `textChannels:${guildId}`;
  try {
    const cachedChannels = await client.get(cacheKey);
    if (cachedChannels) {
      return JSON.parse(cachedChannels);
    }

    const channels = await fetchDiscordChannels(guildId);
    const textChannels = channels.filter(channel => channel.type === 0); // 0 is the type for text channels

    await client.setEx(cacheKey, 300, JSON.stringify(textChannels)); // Cache for 5 minutes (300 seconds)

    return textChannels;
  } catch (error) {
    console.error('Error fetching text channels:', error);
    throw new Error('Failed to fetch text channels');
  }
};

const fetchGuildMembers = async (guildId) => {
  console.log("fetchGuildMembers called");
  const cacheKey = `guildMembers:${guildId}`;
  try {
    const cachedMembers = await client.get(cacheKey);
    if (cachedMembers) {
      return JSON.parse(cachedMembers);
    }

    const response = await axios.get(`https://discord.com/api/v9/guilds/${guildId}/members`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`
      }
    });

    await client.setEx(cacheKey, 300, JSON.stringify(response.data)); // Cache for 5 minutes (300 seconds)

    return response.data;
  } catch (error) {
    console.error('Error fetching guild members:', error);
    throw new Error('Failed to fetch guild members');
  }
};

module.exports = {
  fetchDiscordChannels,
  getVoiceChannels,
  getTextChannels,
  fetchGuildMembers
};
