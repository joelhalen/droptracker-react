'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DiscordEmbed extends Model {
    static associate(models) {
      DiscordEmbed.belongsTo(models.Clan, { foreignKey: 'clanId', onDelete: 'CASCADE' });
    }
  }

  DiscordEmbed.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clans',
        key: 'cid'
      }
    },
    embedData: {
      type: DataTypes.JSON,
      allowNull: false
    },
    type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1  // Assuming a default typeId, update as necessary
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'DiscordEmbed',
    tableName: 'discordembeds',
    timestamps: false
  });

  return DiscordEmbed;
};
