const axios = require('axios');

const fetchGuildMembers = async (guildId) => {
    console.log("fetchGuildMembers called");
    try {
        const response = await axios.get(`https://discord.com/api/v9/guilds/${guildId}/members`, {
            headers: {
                Authorization: `Bot ${process.env.BOT_TOKEN}`
            }
        });

        const members = response.data.map(member => ({
            id: member.user.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatar: member.user.avatar,
            roles: member.roles
        }));

        return members;
    } catch (error) {
        console.error('Error fetching members:', error);
        throw new Error('Failed to fetch members');
    }
};

const fetchGuildRoles = async (guildId) => {
    console.log("fetchGuildRoles called");
    try {
        const response = await axios.get(`https://discord.com/api/v9/guilds/${guildId}/roles`, {
            headers: {
                Authorization: `Bot ${process.env.BOT_TOKEN}`
            }
        });
        const roles = response.data.map(role => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
            permissions: role.permissions
        }));
        return roles;
    } catch (error) {
        console.error('Error fetching roles:', error);
        throw new Error('Failed to fetch roles');
    }
};

// Exporting the functions to be used in other parts of the project
module.exports = {
    fetchGuildMembers,
    fetchGuildRoles
};
