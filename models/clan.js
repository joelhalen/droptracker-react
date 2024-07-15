'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class Clan extends Model {
    static associate(models) {
      Clan.hasMany(models.User, { foreignKey: 'clanId', as: 'members' });
    }
  }
  Clan.init({
    cid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    displayName: DataTypes.STRING,
    discordServerId: DataTypes.STRING,
    description: DataTypes.TEXT,
    clanType: DataTypes.STRING,
    womClanId: DataTypes.INTEGER,
    authedUsers: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    sequelize,
    modelName: 'Clan',
    tableName: 'clans',
    timestamps: false
  });
  return Clan;
};
